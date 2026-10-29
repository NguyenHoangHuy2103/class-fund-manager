import { prisma } from "../../lib/prisma.js"
import { realtimeEventBus } from "../../lib/events.js"
import { AppError } from "../../middleware/error.middleware.js"
import type { MemberStatus } from "@prisma/client"

export async function listMembers(params: {
  classId: string
  search?: string
  status?: "PENDING" | "ACTIVE" | "REJECTED" | "INACTIVE" | "ALL"
  page: number
  limit: number
}) {
  const { classId, search, status, page, limit } = params
  const skip = (page - 1) * limit

  const where: any = { classId }

  if (status && status !== "ALL") {
    where.status = status as MemberStatus
  }

  if (search && search.trim()) {
    const q = search.trim()
    where.OR = [
      { displayName: { contains: q, mode: "insensitive" } },
      { memberCode: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ]
  }

  const [total, items] = await Promise.all([
    prisma.classMember.count({ where }),
    prisma.classMember.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ role: "desc" }, { memberCode: "asc" }],
      include: {
        user: {
          select: { id: true, email: true, phone: true, avatarUrl: true },
        },
      },
    }),
  ])

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

export async function approveMember(classId: string, memberId: string, actorId: string) {
  const member = await prisma.classMember.findFirst({
    where: { id: memberId, classId },
  })

  if (!member) {
    throw new AppError(404, "Không tìm thấy yêu cầu tham gia của thành viên.")
  }

  if (member.status !== "PENDING") {
    throw new AppError(400, "Chỉ có thể phê duyệt thành viên đang ở trạng thái Chờ duyệt (PENDING).")
  }

  const updated = await prisma.$transaction(async (tx) => {
    const m = await tx.classMember.update({
      where: { id: member.id },
      data: { status: "ACTIVE" },
      include: { user: true },
    })

    await tx.auditLog.create({
      data: {
        classId,
        actorId,
        action: "APPROVE",
        targetType: "MEMBER",
        targetId: member.id,
        newValues: { status: "ACTIVE" },
        reason: "Thủ quỹ phê duyệt thành viên vào lớp",
      },
    })

    return m
  })

  realtimeEventBus.emitClassEvent(classId, {
    type: "MEMBER_UPDATED",
    memberId: member.id,
    status: "ACTIVE",
  })

  return updated
}

export async function rejectMember(classId: string, memberId: string, actorId: string) {
  const member = await prisma.classMember.findFirst({
    where: { id: memberId, classId },
  })

  if (!member) {
    throw new AppError(404, "Không tìm thấy yêu cầu tham gia của thành viên.")
  }

  if (member.status !== "PENDING") {
    throw new AppError(400, "Chỉ có thể từ chối thành viên đang ở trạng thái Chờ duyệt (PENDING).")
  }

  const updated = await prisma.$transaction(async (tx) => {
    const m = await tx.classMember.update({
      where: { id: member.id },
      data: { status: "REJECTED" },
    })

    await tx.auditLog.create({
      data: {
        classId,
        actorId,
        action: "REJECT",
        targetType: "MEMBER",
        targetId: member.id,
        newValues: { status: "REJECTED" },
        reason: "Thủ quỹ từ chối yêu cầu tham gia lớp",
      },
    })

    return m
  })

  realtimeEventBus.emitClassEvent(classId, {
    type: "MEMBER_UPDATED",
    memberId: member.id,
    status: "ACTIVE",
  })

  return updated
}

export async function setMemberStatus(
  classId: string,
  memberId: string,
  newStatus: "ACTIVE" | "INACTIVE",
  actorId: string,
) {
  const member = await prisma.classMember.findFirst({
    where: { id: memberId, classId },
  })

  if (!member) {
    throw new AppError(404, "Không tìm thấy thành viên.")
  }

  // RÀNG BUỘC BẮT BUỘC: Chặn vô hiệu hóa thủ quỹ hiện tại trước khi chuyển quyền
  if (member.role === "TREASURER" && newStatus === "INACTIVE") {
    throw new AppError(
      400,
      "Không thể vô hiệu hóa Thủ quỹ hiện tại. Hãy chuyển giao quyền Thủ quỹ cho thành viên khác trước khi vô hiệu hóa.",
    )
  }

  const updated = await prisma.$transaction(async (tx) => {
    const m = await tx.classMember.update({
      where: { id: member.id },
      data: { status: newStatus },
    })

    await tx.auditLog.create({
      data: {
        classId,
        actorId,
        action: "UPDATE",
        targetType: "MEMBER",
        targetId: member.id,
        oldValues: { status: member.status },
        newValues: { status: newStatus },
        reason: `Cập nhật trạng thái thành viên sang ${newStatus}`,
      },
    })

    return m
  })

  realtimeEventBus.emitClassEvent(classId, {
    type: "MEMBER_UPDATED",
    memberId: member.id,
    status: "ACTIVE",
  })

  return updated
}
