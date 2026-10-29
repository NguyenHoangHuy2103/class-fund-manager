import { prisma } from "../../lib/prisma.js"
import { AppError } from "../../middleware/error.middleware.js"
import type { MemberStatus } from "@prisma/client"

export async function listMembers(params: {
  search?: string
  status?: "ACTIVE" | "INACTIVE" | "ALL"
  page: number
  limit: number
}) {
  const { search, status, page, limit } = params
  const skip = (page - 1) * limit

  const where: any = {}

  if (status && status !== "ALL") {
    where.status = (status as MemberStatus)
  }

  if (search && search.trim()) {
    const q = search.trim()
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ]
  }

  const [total, members] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      skip,
      take: limit,
      orderBy: { code: "asc" },
      include: {
        user: {
          select: { id: true, role: true },
        },
      },
    }),
  ])

  return {
    items: members,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

export async function getMemberById(id: string) {
  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, role: true },
      },
    },
  })
  if (!member) {
    throw new AppError(404, "Không tìm thấy thành viên.")
  }
  return member
}

export async function createMember(data: {
  code: string
  name: string
  email: string
  phone?: string
}) {
  // Kiểm tra trùng code hoặc email
  const existingCode = await prisma.member.findUnique({
    where: { code: data.code },
  })
  if (existingCode) {
    throw new AppError(
      400,
      `Mã thành viên ${data.code} đã tồn tại trong danh sách.`,
    )
  }

  const existingEmail = await prisma.member.findUnique({
    where: { email: data.email },
  })
  if (existingEmail) {
    throw new AppError(
      400,
      `Email ${data.email} đã được đăng ký cho thành viên khác.`,
    )
  }

  return prisma.member.create({
    data: {
      code: data.code,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      status: "ACTIVE",
    },
  })
}

export async function updateMember(
  id: string,
  data: {
    name?: string
    phone?: string
  },
) {
  await getMemberById(id)

  return prisma.member.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name } : {}),
      phone: data.phone !== undefined ? data.phone || null : undefined,
    },
  })
}

export async function setMemberStatus(id: string, status: MemberStatus) {
  await getMemberById(id)

  return prisma.member.update({
    where: { id },
    data: { status },
  })
}
