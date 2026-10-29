import crypto from "crypto"
import { prisma } from "../../lib/prisma.js"
import { realtimeEventBus } from "../../lib/events.js"
import { AppError } from "../../middleware/error.middleware.js"

export async function createClass(
  userId: string,
  code: string,
  name: string,
  memberCode: string,
  displayName: string,
  ipAddress?: string,
  deviceHash?: string,
) {
  // 1. Kiểm tra ràng buộc: Mỗi user chỉ tạo tối đa 1 lớp
  const existingClass = await prisma.class.findUnique({
    where: { createdById: userId },
  })
  if (existingClass) {
    throw new AppError(400, "Mỗi tài khoản người dùng chỉ được phép tạo tối đa 1 lớp học.")
  }

  // 2. Kiểm tra trùng mã lớp
  const codeExists = await prisma.class.findUnique({ where: { code } })
  if (codeExists) {
    throw new AppError(400, "Mã lớp này đã được sử dụng. Vui lòng chọn mã lớp khác.")
  }

  // 3. Kiểm tra nghi vấn tạo trùng lớp (cùng IP hoặc cùng thiết bị)
  let isFlaggedDuplicate = false
  if (ipAddress || deviceHash) {
    const duplicateCount = await prisma.class.count({
      where: {
        OR: [
          ...(ipAddress ? [{ createdIp: ipAddress }] : []),
          ...(deviceHash ? [{ createdDeviceHash: deviceHash }] : []),
        ],
      },
    })
    if (duplicateCount > 0) {
      isFlaggedDuplicate = true // Vẫn cho tạo nhưng gắn cờ để Admin xem xét
    }
  }

  // Sinh mã mời ngẫu nhiên 6 ký tự
  const inviteCode = crypto.randomBytes(3).toString("hex").toUpperCase()

  // 4. Khởi tạo lớp + thủ quỹ + kỳ đầu tiên trong một Interactive Transaction
  return await prisma.$transaction(async (tx) => {
    const newClass = await tx.class.create({
      data: {
        code,
        name,
        inviteCode,
        isInviteActive: true,
        createdById: userId,
        createdIp: ipAddress,
        createdDeviceHash: deviceHash,
        isFlaggedDuplicate,
      },
    })

    // Gán vai trò TREASURER cho người tạo
    const member = await tx.classMember.create({
      data: {
        classId: newClass.id,
        userId,
        memberCode,
        displayName,
        role: "TREASURER",
        status: "ACTIVE",
      },
    })

    // Khởi tạo kỳ OPEN đầu tiên
    const now = new Date()
    const periodName = `Học kỳ 1 (${now.getFullYear()} - ${now.getFullYear() + 1})`
    await tx.period.create({
      data: {
        classId: newClass.id,
        name: periodName,
        startDate: now,
        status: "OPEN",
        openingCash: BigInt(0),
        openingBank: BigInt(0),
      },
    })

    // Ghi Audit Log
    await tx.auditLog.create({
      data: {
        classId: newClass.id,
        actorId: userId,
        action: "CREATE",
        targetType: "CLASS",
        targetId: newClass.id,
        newValues: { code, name, inviteCode },
        reason: "Khởi tạo lớp học mới",
        ipAddress,
      },
    })

    return {
      class: newClass,
      member,
    }
  })
}

export async function joinClassByInviteCode(
  userId: string,
  inviteCode: string,
  memberCode: string,
  displayName: string,
) {
  const targetClass = await prisma.class.findUnique({
    where: { inviteCode },
  })

  if (!targetClass) {
    throw new AppError(404, "Mã mời lớp không chính xác hoặc không tồn tại.")
  }

  if (!targetClass.isInviteActive) {
    throw new AppError(400, "Lớp này hiện đang tạm dừng nhận thành viên mới.")
  }

  if (targetClass.isLocked) {
    throw new AppError(403, "Lớp học này hiện đang bị tạm khóa.")
  }

  // Kiểm tra xem đã gửi yêu cầu vào lớp này chưa
  const existingMember = await prisma.classMember.findUnique({
    where: {
      classId_userId: {
        classId: targetClass.id,
        userId,
      },
    },
  })

  if (existingMember) {
    if (existingMember.status === "ACTIVE") {
      throw new AppError(400, "Bạn đã là thành viên chính thức của lớp này.")
    }
    if (existingMember.status === "PENDING") {
      throw new AppError(400, "Yêu cầu tham gia của bạn đang chờ thủ quỹ duyệt.")
    }
    if (existingMember.status === "REJECTED") {
      throw new AppError(
        400,
        "Yêu cầu tham gia của bạn trước đó đã bị từ chối. Vui lòng bấm 'Gửi lại yêu cầu' thay vì tham gia lại từ đầu.",
      )
    }
    throw new AppError(403, "Tài khoản của bạn trong lớp này đang bị tạm dừng.")
  }

  // Kiểm tra trùng MSSV trong cùng một lớp
  const codeExists = await prisma.classMember.findFirst({
    where: {
      classId: targetClass.id,
      memberCode,
    },
  })
  if (codeExists) {
    throw new AppError(400, "Mã số sinh viên (MSSV) này đã có trong danh sách lớp.")
  }

  // Tạo bản ghi trạng thái PENDING
  const member = await prisma.classMember.create({
    data: {
      classId: targetClass.id,
      userId,
      memberCode,
      displayName,
      role: "MEMBER",
      status: "PENDING",
    },
    include: {
      class: true,
    },
  })

  return {
    member,
    message: "Yêu cầu tham gia lớp đã được gửi. Vui lòng chờ Thủ quỹ phê duyệt.",
  }
}

export async function reapplyJoin(userId: string, classId: string) {
  const member = await prisma.classMember.findUnique({
    where: { classId_userId: { classId, userId } },
  })

  if (!member) {
    throw new AppError(404, "Không tìm thấy yêu cầu tham gia lớp.")
  }

  if (member.status !== "REJECTED") {
    throw new AppError(400, "Chỉ có thể xin lại khi yêu cầu ở trạng thái bị từ chối (REJECTED).")
  }

  const updated = await prisma.classMember.update({
    where: { id: member.id },
    data: { status: "PENDING" },
  })

  return {
    member: updated,
    message: "Đã gửi lại yêu cầu tham gia lớp thành công. Vui lòng chờ duyệt.",
  }
}

export async function cancelJoinRequest(userId: string, classId: string) {
  const member = await prisma.classMember.findUnique({
    where: { classId_userId: { classId, userId } },
  })

  if (!member) {
    throw new AppError(404, "Không tìm thấy yêu cầu tham gia lớp.")
  }

  if (member.status !== "PENDING" && member.status !== "REJECTED") {
    throw new AppError(400, "Không thể hủy khi đã là thành viên chính thức.")
  }

  await prisma.classMember.delete({
    where: { id: member.id },
  })

  return { message: "Đã hủy yêu cầu tham gia lớp." }
}

export async function getCurrentClass(classId: string) {
  const c = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      periods: {
        where: { status: "OPEN" },
      },
    },
  })

  if (!c) {
    throw new AppError(404, "Không tìm thấy lớp học.")
  }

  return c
}

export async function updateInviteCode(
  classId: string,
  isInviteActive?: boolean,
  regenerate?: boolean,
) {
  const data: { isInviteActive?: boolean; inviteCode?: string } = {}
  if (typeof isInviteActive === "boolean") {
    data.isInviteActive = isInviteActive
  }
  if (regenerate) {
    data.inviteCode = crypto.randomBytes(3).toString("hex").toUpperCase()
  }

  const updated = await prisma.class.update({
    where: { id: classId },
    data,
  })

  return updated
}

export async function updateBankConfig(
  classId: string,
  bankBin: string,
  bankName: string,
  bankAccountNo: string,
  bankAccountHolder: string,
  actorId: string,
) {
  const current = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      bankBin: true,
      bankName: true,
      bankAccountNo: true,
      bankAccountHolder: true,
    },
  })

  const updated = await prisma.$transaction(async (tx) => {
    const c = await tx.class.update({
      where: { id: classId },
      data: {
        bankBin,
        bankName,
        bankAccountNo,
        bankAccountHolder: bankAccountHolder.toUpperCase().trim(),
      },
    })

    await tx.auditLog.create({
      data: {
        classId,
        actorId,
        action: "UPDATE",
        targetType: "BANK_CONFIG",
        targetId: classId,
        oldValues: current ? JSON.parse(JSON.stringify(current)) : undefined,
        newValues: {
          bankBin,
          bankName,
          bankAccountNo,
          bankAccountHolder: bankAccountHolder.toUpperCase().trim(),
        },
        reason: "Thủ quỹ cập nhật thông tin tài khoản ngân hàng của lớp",
      },
    })

    return c
  })

  realtimeEventBus.emitClassEvent(classId, {
    type: "BANK_CONFIG_UPDATED",
  })

  return updated
}
