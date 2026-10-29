import fs from "fs"
import path from "path"
import crypto from "crypto"
import { prisma } from "../../lib/prisma.js"
import { env } from "../../config/env.js"
import { AppError } from "../../middleware/error.middleware.js"
import type { FileCategory } from "@prisma/client"
import type { JwtPayload } from "../../lib/auth.js"

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

const MIME_EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
}

export async function savePrivateFile(params: {
  classId: string
  fileBuffer: Buffer
  originalName: string
  mimeType: string
  sizeBytes: number
  category: FileCategory
  uploadedById: string
}) {
  const { classId, fileBuffer, originalName, mimeType, sizeBytes, category, uploadedById } =
    params

  // 1. Kiểm tra định dạng MIME
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new AppError(
      400,
      "Định dạng file không được hỗ trợ. Chỉ chấp nhận file JPG, PNG, WEBP hoặc PDF.",
    )
  }

  // 2. Kiểm tra dung lượng
  if (sizeBytes > MAX_FILE_SIZE || fileBuffer.length > MAX_FILE_SIZE) {
    throw new AppError(400, "Dung lượng file vượt quá giới hạn cho phép (Tối đa 5MB).")
  }

  // 3. Đường dẫn lưu trữ private trên đĩa cục bộ
  const ext = MIME_EXT_MAP[mimeType] || ".bin"
  const fileName = `${crypto.randomUUID()}${ext}`
  const relativeDir = path.join("classes", classId, category.toLowerCase())
  const absoluteDir = path.resolve(env.STORAGE_PATH, relativeDir)

  await fs.promises.mkdir(absoluteDir, { recursive: true })

  const absoluteFilePath = path.join(absoluteDir, fileName)
  const storageKey = path.join(relativeDir, fileName).replace(/\\/g, "/")

  await fs.promises.writeFile(absoluteFilePath, fileBuffer)

  // 4. Lưu metadata vào cơ sở dữ liệu
  const metadata = await prisma.fileMetadata.create({
    data: {
      classId,
      storageKey,
      originalName,
      mimeType,
      sizeBytes,
      category,
      uploadedById,
    },
  })

  return metadata
}

export async function getAuthorizedFile(fileId: string, user: JwtPayload) {
  const meta = await prisma.fileMetadata.findUnique({
    where: { id: fileId },
  })

  if (!meta) {
    throw new AppError(404, "Không tìm thấy file tài liệu.")
  }

  // Phân quyền chặt chẽ:
  // Super Admin luôn có quyền xem
  if (user.globalRole === "SUPER_ADMIN") {
    return resolveFileResult(meta)
  }

  // Phải thuộc cùng lớp học
  if (user.classId !== meta.classId) {
    throw new AppError(403, "Bạn không có quyền truy cập file của lớp học khác.")
  }

  // Với bill chuyển khoản (PAYMENT_PROOF):
  // Chỉ người nộp HOẶC Thủ quỹ của lớp mới được xem
  if (meta.category === "PAYMENT_PROOF") {
    const isUploader = user.userId === meta.uploadedById
    const isTreasurer = user.classRole === "TREASURER"

    if (!isUploader && !isTreasurer) {
      throw new AppError(
        403,
        "Bạn không có quyền xem bằng chứng chuyển khoản của thành viên khác.",
      )
    }
  }

  return resolveFileResult(meta)
}

async function resolveFileResult(meta: {
  id: string
  storageKey: string
  originalName: string
  mimeType: string
  sizeBytes: number
}) {
  const absoluteFilePath = path.resolve(env.STORAGE_PATH, meta.storageKey)

  try {
    await fs.promises.access(absoluteFilePath, fs.constants.R_OK)
  } catch {
    throw new AppError(404, "File không tồn tại trên hệ thống lưu trữ.")
  }

  return {
    filePath: absoluteFilePath,
    originalName: meta.originalName,
    mimeType: meta.mimeType,
    sizeBytes: meta.sizeBytes,
  }
}
