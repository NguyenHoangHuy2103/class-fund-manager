import type { Request, Response, NextFunction } from "express"
import fs from "fs"
import * as storageService from "./storage.service.js"
import { AppError } from "../../middleware/error.middleware.js"
import type { FileCategory } from "@prisma/client"

export async function uploadFile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const file = req.file
    if (!file) {
      throw new AppError(400, "Vui lòng chọn file cần tải lên.")
    }

    const classId = req.user?.classId
    if (!classId) {
      throw new AppError(400, "Bạn chưa thuộc về lớp học nào để tải lên file.")
    }

    const category = (req.body.category || "PAYMENT_PROOF") as FileCategory

    const meta = await storageService.savePrivateFile({
      classId,
      fileBuffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      category,
      uploadedById: req.user!.userId,
    })

    res.status(201).json({
      ok: true,
      message: "Tải lên file thành công.",
      data: {
        fileId: meta.id,
        originalName: meta.originalName,
        mimeType: meta.mimeType,
        sizeBytes: meta.sizeBytes,
        category: meta.category,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function getFile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const fileId = req.params.id
    const fileInfo = await storageService.getAuthorizedFile(fileId, req.user!)

    res.setHeader("Content-Type", fileInfo.mimeType)
    res.setHeader("Content-Length", fileInfo.sizeBytes)
    res.setHeader("Cache-Control", "private, max-age=3600")

    const stream = fs.createReadStream(fileInfo.filePath)
    stream.pipe(res)
  } catch (error) {
    next(error)
  }
}
