import crypto from "crypto"
import { prisma } from "../../lib/prisma.js"
import { realtimeEventBus } from "../../lib/events.js"
import { AppError } from "../../middleware/error.middleware.js"
import type { ObligationStatus } from "@prisma/client"

function hashPayload(payload: unknown): string {
  return crypto
    .createHash("sha256")
    .update(typeof payload === "string" ? payload : JSON.stringify(payload))
    .digest("hex")
}

// 1. Tạo đợt thu mới
export async function createCollection(params: {
  classId: string
  name: string
  defaultAmount: string
  dueDate?: string | null
  description?: string
  targetMemberIds?: string[]
  actorId: string
}) {
  const { classId, name, defaultAmount, dueDate, description, targetMemberIds, actorId } =
    params

  // 1. Lấy kỳ đang OPEN của lớp
  const currentPeriod = await prisma.period.findFirst({
    where: { classId, status: "OPEN" },
  })

  if (!currentPeriod) {
    throw new AppError(
      400,
      "Lớp học chưa có kỳ hoạt động nào đang mở (OPEN). Vui lòng mở kỳ trước khi tạo đợt thu.",
    )
  }

  // 2. Lấy danh sách thành viên ACTIVE của lớp
  const allActiveMembers = await prisma.classMember.findMany({
    where: { classId, status: "ACTIVE" },
  })

  if (allActiveMembers.length === 0) {
    throw new AppError(400, "Lớp học chưa có thành viên chính thức (ACTIVE) nào để tạo đợt thu.")
  }

  let selectedMembers = allActiveMembers
  if (targetMemberIds && targetMemberIds.length > 0) {
    selectedMembers = allActiveMembers.filter((m) => targetMemberIds.includes(m.id))
    if (selectedMembers.length === 0) {
      throw new AppError(400, "Không tìm thấy thành viên hợp lệ nào trong danh sách được chọn.")
    }
  }

  const defaultAmountBigInt = BigInt(defaultAmount)

  // 3. Khởi tạo đợt thu và các nghĩa vụ đóng trong một Interactive Transaction
  const createdResult = await prisma.$transaction(async (tx) => {
    const collection = await tx.collection.create({
      data: {
        classId,
        periodId: currentPeriod.id,
        name,
        defaultAmount: defaultAmountBigInt,
        dueDate: dueDate ? new Date(dueDate) : null,
        description,
        status: "OPEN",
      },
    })

    // Tạo nghĩa vụ đóng cho từng thành viên
    const obligationData = selectedMembers.map((m) => ({
      collectionId: collection.id,
      classMemberId: m.id,
      targetAmount: defaultAmountBigInt,
      paidAmount: 0n,
      status: "UNPAID" as ObligationStatus,
    }))

    await tx.collectionMember.createMany({
      data: obligationData,
    })

    await tx.auditLog.create({
      data: {
        classId,
        actorId,
        action: "CREATE",
        targetType: "COLLECTION",
        targetId: collection.id,
        newValues: {
          name,
          defaultAmount,
          dueDate,
          periodId: currentPeriod.id,
          memberCount: selectedMembers.length,
        },
        reason: "Thủ quỹ tạo đợt thu quỹ mới",
      },
    })

    return {
      collection: {
        ...collection,
        defaultAmount: collection.defaultAmount.toString(),
      },
      memberCount: selectedMembers.length,
    }
  })

  realtimeEventBus.emitClassEvent(classId, {
    type: "COLLECTION_CREATED",
    collectionId: createdResult.collection.id,
    name: createdResult.collection.name,
  })

  return createdResult
}

// 2. Danh sách các đợt thu trong lớp
export async function getCollections(classId: string, periodId?: string) {
  const where: any = { classId }
  if (periodId) {
    where.periodId = periodId
  }

  const collections = await prisma.collection.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      period: { select: { id: true, name: true, status: true } },
      members: {
        select: {
          id: true,
          targetAmount: true,
          paidAmount: true,
          status: true,
        },
      },
      paymentProofs: {
        where: { status: "PENDING" },
        select: { id: true },
      },
    },
  })

  return collections.map((c) => {
    let targetTotal = 0n
    let collectedTotal = 0n
    let paidCount = 0
    let partialCount = 0
    let unpaidCount = 0
    let exemptCount = 0

    for (const m of c.members) {
      targetTotal += m.targetAmount
      collectedTotal += m.paidAmount

      if (m.status === "PAID") paidCount++
      else if (m.status === "PARTIAL") partialCount++
      else if (m.status === "UNPAID") unpaidCount++
      else if (m.status === "EXEMPT") exemptCount++
    }

    return {
      id: c.id,
      name: c.name,
      defaultAmount: c.defaultAmount.toString(),
      dueDate: c.dueDate,
      description: c.description,
      status: c.status,
      createdAt: c.createdAt,
      period: c.period,
      stats: {
        totalMembers: c.members.length,
        targetTotal: targetTotal.toString(),
        collectedTotal: collectedTotal.toString(),
        remainingTotal: (targetTotal > collectedTotal ? targetTotal - collectedTotal : 0n).toString(),
        paidCount,
        partialCount,
        unpaidCount,
        exemptCount,
        pendingProofCount: c.paymentProofs.length,
      },
    }
  })
}

// 3. Chi tiết một đợt thu kèm danh sách nghĩa vụ thành viên
export async function getCollectionDetail(
  classId: string,
  collectionId: string,
  user: { userId: string; classRole?: string; memberId?: string; globalRole: string },
) {
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, classId },
    include: {
      period: { select: { id: true, name: true, status: true } },
      members: {
        orderBy: [{ classMember: { role: "desc" } }, { classMember: { memberCode: "asc" } }],
        include: {
          classMember: {
            include: {
              user: { select: { id: true, email: true, fullName: true, avatarUrl: true } },
            },
          },
          payments: {
            select: { id: true, amount: true, fundType: true, paidAt: true },
          },
        },
      },
    },
  })

  if (!collection) {
    throw new AppError(404, "Không tìm thấy đợt thu trong lớp này.")
  }

  const isTreasurerOrAdmin =
    user.globalRole === "SUPER_ADMIN" || user.classRole === "TREASURER"

  let memberList = collection.members
  // Nếu là MEMBER thông thường, chỉ xem được nghĩa vụ của chính mình trong danh sách
  if (!isTreasurerOrAdmin) {
    memberList = collection.members.filter((m) => m.classMemberId === user.memberId)
  }

  const formattedMembers = memberList.map((m) => {
    const target = m.targetAmount
    const netPaid = m.paidAmount // SSOT đóng ròng
    const remaining = target > netPaid ? target - netPaid : 0n
    const overpaid = netPaid > target ? netPaid - target : 0n

    return {
      obligationId: m.id,
      classMemberId: m.classMemberId,
      memberCode: m.classMember.memberCode,
      displayName: m.classMember.displayName,
      email: m.classMember.user.email,
      avatarUrl: m.classMember.user.avatarUrl,
      role: m.classMember.role,
      targetAmount: target.toString(),
      paidAmount: netPaid.toString(),
      remainingAmount: remaining.toString(),
      overpaidAmount: overpaid.toString(),
      status: m.status,
      discountReason: m.discountReason,
      payments: m.payments.map((p) => ({
        id: p.id,
        amount: p.amount.toString(),
        fundType: p.fundType,
        paidAt: p.paidAt,
      })),
    }
  })

  // Thống kê toàn đợt thu
  let targetTotal = 0n
  let collectedTotal = 0n
  for (const m of collection.members) {
    targetTotal += m.targetAmount
    collectedTotal += m.paidAmount
  }

  return {
    id: collection.id,
    name: collection.name,
    defaultAmount: collection.defaultAmount.toString(),
    dueDate: collection.dueDate,
    description: collection.description,
    status: collection.status,
    period: collection.period,
    createdAt: collection.createdAt,
    stats: {
      totalMembers: collection.members.length,
      targetTotal: targetTotal.toString(),
      collectedTotal: collectedTotal.toString(),
      remainingTotal: (targetTotal > collectedTotal ? targetTotal - collectedTotal : 0n).toString(),
    },
    members: formattedMembers,
  }
}

// 4. Điều chỉnh nghĩa vụ / Miễn giảm
export async function adjustObligation(params: {
  classId: string
  collectionId: string
  memberId: string
  targetAmount: string
  discountReason: string
  actorId: string
}) {
  const { classId, collectionId, memberId, targetAmount, discountReason, actorId } = params

  const obligation = await prisma.collectionMember.findFirst({
    where: {
      id: memberId,
      collection: { id: collectionId, classId },
    },
    include: { collection: true, classMember: true },
  })

  if (!obligation) {
    throw new AppError(404, "Không tìm thấy nghĩa vụ đóng của thành viên trong đợt thu này.")
  }

  const newTarget = BigInt(targetAmount)
  const paid = obligation.paidAmount

  // Tính toán status mới
  let newStatus: ObligationStatus = "UNPAID"
  if (newTarget === 0n) {
    newStatus = "EXEMPT"
  } else if (paid >= newTarget) {
    newStatus = "PAID"
  } else if (paid > 0n) {
    newStatus = "PARTIAL"
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.collectionMember.update({
      where: { id: obligation.id },
      data: {
        targetAmount: newTarget,
        status: newStatus,
        discountReason,
        adjustedById: actorId,
        adjustedAt: new Date(),
      },
    })

    await tx.auditLog.create({
      data: {
        classId,
        actorId,
        action: "UPDATE",
        targetType: "OBLIGATION",
        targetId: obligation.id,
        oldValues: {
          targetAmount: obligation.targetAmount.toString(),
          status: obligation.status,
        },
        newValues: {
          targetAmount: newTarget.toString(),
          status: newStatus,
          discountReason,
        },
        reason: `Điều chỉnh nghĩa vụ thành viên: ${discountReason}`,
      },
    })

    return {
      obligationId: updated.id,
      targetAmount: updated.targetAmount.toString(),
      paidAmount: updated.paidAmount.toString(),
      status: updated.status,
      discountReason: updated.discountReason,
    }
  })

  realtimeEventBus.emitClassEvent(classId, {
    type: "OBLIGATION_ADJUSTED",
    collectionId,
    memberId,
    status: result.status,
  })

  return result
}

// 5. Sinh thông tin VietQR Napas247 điền sẵn số tiền và nội dung
export async function getVietQrInfo(params: {
  classId: string
  collectionId: string
  memberId?: string
  customAmount?: string
  reqUserMemberId?: string
}) {
  const { classId, collectionId, memberId, customAmount, reqUserMemberId } = params

  const targetMemberId = memberId || reqUserMemberId
  if (!targetMemberId) {
    throw new AppError(400, "Không xác định được thành viên cần đóng quỹ.")
  }

  // 1. Kiểm tra cấu hình ngân hàng của lớp
  const targetClass = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      code: true,
      bankBin: true,
      bankName: true,
      bankAccountNo: true,
      bankAccountHolder: true,
    },
  })

  if (!targetClass) {
    throw new AppError(404, "Không tìm thấy thông tin lớp học.")
  }

  // Nếu lớp chưa cấu hình ngân hàng: Trả về trạng thái rõ ràng, KHÔNG sinh QR giả
  if (
    !targetClass.bankBin ||
    !targetClass.bankAccountNo ||
    !targetClass.bankAccountHolder
  ) {
    return {
      hasBankConfig: false,
      message:
        "Lớp học chưa cấu hình tài khoản ngân hàng nhận tiền quỹ. Vui lòng liên hệ Thủ quỹ hoặc chọn nộp tiền mặt trực tiếp.",
    }
  }

  // 2. Lấy thông tin đợt thu và nghĩa vụ thành viên
  const obligation = await prisma.collectionMember.findFirst({
    where: {
      collectionId,
      classMemberId: targetMemberId,
      collection: { classId },
    },
    include: {
      collection: { select: { id: true, name: true, defaultAmount: true } },
      classMember: { select: { id: true, memberCode: true, displayName: true } },
    },
  })

  if (!obligation) {
    throw new AppError(404, "Không tìm thấy nghĩa vụ đóng quỹ của thành viên này.")
  }

  const remaining =
    obligation.targetAmount > obligation.paidAmount
      ? obligation.targetAmount - obligation.paidAmount
      : 0n

  let payAmount = remaining
  if (customAmount) {
    const custom = BigInt(customAmount)
    if (custom <= 0n) {
      throw new AppError(400, "Số tiền đóng phải lớn hơn 0.")
    }
    payAmount = custom
  }

  // Nội dung chuyển khoản gọn gàng, định danh ổn định: CF [MãLớp] [MSSV] [MãThu]
  const shortCollectionCode = obligation.collection.id.slice(-6).toUpperCase()
  const transferContent = `CF ${targetClass.code} ${obligation.classMember.memberCode} ${shortCollectionCode}`.trim()

  // Sinh VietQR Napas247 URL
  const qrImageUrl = `https://img.vietqr.io/image/${targetClass.bankBin}-${targetClass.bankAccountNo}-compact2.png?amount=${payAmount.toString()}&addInfo=${encodeURIComponent(
    transferContent,
  )}&accountName=${encodeURIComponent(targetClass.bankAccountHolder)}`

  return {
    hasBankConfig: true,
    bankBin: targetClass.bankBin,
    bankName: targetClass.bankName,
    bankAccountNo: targetClass.bankAccountNo,
    bankAccountHolder: targetClass.bankAccountHolder,
    amount: payAmount.toString(),
    remainingAmount: remaining.toString(),
    transferContent,
    qrImageUrl,
    memberCode: obligation.classMember.memberCode,
    displayName: obligation.classMember.displayName,
    collectionName: obligation.collection.name,
  }
}

// 6. Thành viên báo chuyển khoản (Nộp bill kèm snapshot ngân hàng & Idempotency)
export async function submitPaymentProof(params: {
  classId: string
  collectionId: string
  classMemberId: string
  amount: string
  fileId: string
  transferCode?: string
  note?: string
  idempotencyKey?: string
  actorUserId: string
}) {
  const {
    classId,
    collectionId,
    classMemberId,
    amount,
    fileId,
    transferCode,
    note,
    idempotencyKey,
    actorUserId,
  } = params

  const payloadHash = hashPayload({ collectionId, classMemberId, amount, fileId, transferCode })

  // 1. Kiểm tra Idempotency chống gửi trùng
  if (idempotencyKey) {
    const existingProof = await prisma.paymentProof.findUnique({
      where: { idempotencyKey },
      include: { file: true },
    })

    if (existingProof) {
      if (existingProof.requestHash === payloadHash) {
        // Cùng key, cùng payload: Trả lại kết quả đã ghi nhận
        return {
          proof: {
            ...existingProof,
            amount: existingProof.amount.toString(),
          },
          isReplay: true,
        }
      } else {
        // Cùng key, khác payload: Từ chối xung đột
        throw new AppError(
          409,
          "Idempotency key này đã được sử dụng cho một yêu cầu báo chuyển khác.",
        )
      }
    }
  }

  // 2. Xác thực file bill thuộc về lớp và do user này upload
  const file = await prisma.fileMetadata.findFirst({
    where: { id: fileId, classId, uploadedById: actorUserId, category: "PAYMENT_PROOF" },
  })

  if (!file) {
    throw new AppError(400, "File bill chuyển khoản không hợp lệ hoặc không thuộc quyền sở hữu của bạn.")
  }

  // 3. Xác thực nghĩa vụ đóng của thành viên
  const obligation = await prisma.collectionMember.findUnique({
    where: { collectionId_classMemberId: { collectionId, classMemberId } },
  })

  if (!obligation) {
    throw new AppError(404, "Không tìm thấy nghĩa vụ đóng của bạn trong đợt thu này.")
  }

  // 4. Lấy snapshot tài khoản ngân hàng của lớp tại thời điểm nộp bill
  const currentClass = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      bankBin: true,
      bankName: true,
      bankAccountNo: true,
      bankAccountHolder: true,
    },
  })

  const bankSnapshot = {
    bankBin: currentClass?.bankBin,
    bankName: currentClass?.bankName,
    bankAccountNo: currentClass?.bankAccountNo,
    bankAccountHolder: currentClass?.bankAccountHolder,
    expectedAmount: amount,
    submittedAt: new Date().toISOString(),
  }

  const newProof = await prisma.paymentProof.create({
    data: {
      collectionId,
      classMemberId,
      amount: BigInt(amount),
      fileId,
      transferCode,
      note,
      status: "PENDING",
      bankSnapshot,
      idempotencyKey,
      requestHash: payloadHash,
    },
    include: {
      file: true,
      classMember: {
        include: { user: { select: { email: true, fullName: true } } },
      },
    },
  })

  realtimeEventBus.emitClassEvent(classId, {
    type: "PROOF_SUBMITTED",
    collectionId,
    proofId: newProof.id,
    amount: newProof.amount.toString(),
  })

  return {
    proof: {
      ...newProof,
      amount: newProof.amount.toString(),
    },
    isReplay: false,
  }
}

// 7. Thủ quỹ duyệt bill chuyển khoản (Đơn lẻ - Interactive Transaction & Pessimistic Lock)
export async function approvePaymentProof(params: {
  classId: string
  proofId: string
  actorId: string
  actorMemberId: string
  actualAmount?: string
}) {
  const { classId, proofId, actorId, actorMemberId, actualAmount } = params

  const result = await prisma.$transaction(async (tx) => {
    // 1. Khóa bản ghi PaymentProof và kiểm tra trạng thái
    const proof = await tx.paymentProof.findFirst({
      where: { id: proofId, collection: { classId } },
      include: {
        collection: { select: { id: true, periodId: true, name: true } },
        classMember: { select: { id: true, memberCode: true, displayName: true } },
      },
    })

    if (!proof) {
      throw new AppError(404, "Không tìm thấy bằng chứng chuyển khoản trong lớp này.")
    }

    if (proof.status !== "PENDING") {
      throw new AppError(
        400,
        `Bằng chứng chuyển khoản này đã được xử lý từ trước (Trạng thái: ${proof.status}).`,
      )
    }

    const approvedAmount = actualAmount ? BigInt(actualAmount) : proof.amount
    if (approvedAmount <= 0n) {
      throw new AppError(400, "Số tiền thực nhận phải là số nguyên dương lớn hơn 0.")
    }

    // 2. Khóa dòng nghĩa vụ CollectionMember bằng FOR UPDATE để chống Lost Update khi duyệt đồng thời
    await tx.$executeRaw`SELECT id FROM "CollectionMember" WHERE "collectionId" = ${proof.collectionId} AND "classMemberId" = ${proof.classMemberId} FOR UPDATE`

    const obligation = await tx.collectionMember.findUnique({
      where: {
        collectionId_classMemberId: {
          collectionId: proof.collectionId,
          classMemberId: proof.classMemberId,
        },
      },
    })

    if (!obligation) {
      throw new AppError(404, "Không tìm thấy nghĩa vụ đóng quỹ tương ứng của thành viên.")
    }

    // 3. Đánh dấu Proof là APPROVED
    await tx.paymentProof.update({
      where: { id: proof.id },
      data: {
        status: "APPROVED",
        reviewedById: actorMemberId,
        reviewedAt: new Date(),
      },
    })

    // 4. Sinh mã giao dịch duy nhất cho lớp
    const code = `THU-BANK-${Date.now().toString().slice(-6)}`

    // 5. Ghi bút toán vào Sổ cái (Ledger - SSOT)
    const transaction = await tx.transaction.create({
      data: {
        classId,
        periodId: proof.collection.periodId,
        code,
        date: new Date(),
        type: "COLLECTION_FEE",
        fundType: "BANK",
        amount: approvedAmount,
        category: proof.collection.name,
        description: `Thu tiền chuyển khoản đợt: ${proof.collection.name} - ${proof.classMember.displayName} (${proof.classMember.memberCode})`,
        counterparty: proof.classMember.displayName,
      },
    })

    // 6. Tạo khoản thanh toán Payment liên kết 1-1 với Proof và Transaction (ghi nhận số thực nhận)
    const payment = await tx.payment.create({
      data: {
        collectionId: proof.collectionId,
        classMemberId: proof.classMemberId,
        obligationId: obligation.id,
        amount: approvedAmount,
        fundType: "BANK",
        paymentProofId: proof.id,
        transactionId: transaction.id,
        recordedById: actorMemberId,
        note: `Duyệt bill chuyển khoản #${proof.id.slice(-6)}${actualAmount ? ` (Khai báo: ${proof.amount.toString()}, Thực nhận: ${approvedAmount.toString()})` : ""}`,
      },
    })

    // 7. Cập nhật cache đóng ròng và trạng thái nghĩa vụ (Lock-safe)
    const newPaidAmount = obligation.paidAmount + approvedAmount
    let newStatus: ObligationStatus = obligation.status
    if (obligation.status !== "EXEMPT") {
      if (newPaidAmount >= obligation.targetAmount) {
        newStatus = "PAID"
      } else if (newPaidAmount > 0n) {
        newStatus = "PARTIAL"
      }
    }

    const updatedObligation = await tx.collectionMember.update({
      where: { id: obligation.id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    })

    // 8. Ghi Audit Log lưu vết số khai báo ban đầu và số thực nhận
    await tx.auditLog.create({
      data: {
        classId,
        actorId,
        action: "APPROVE",
        targetType: "PAYMENT_PROOF",
        targetId: proof.id,
        newValues: {
          paymentId: payment.id,
          transactionId: transaction.id,
          declaredAmount: proof.amount.toString(),
          actualAmount: approvedAmount.toString(),
          fundType: "BANK",
        },
        reason: actualAmount
          ? `Thủ quỹ phê duyệt bill chuyển khoản (Thực nhận: ${approvedAmount.toString()}, Khai báo: ${proof.amount.toString()})`
          : "Thủ quỹ phê duyệt bằng chứng chuyển khoản",
      },
    })

    return {
      proofId: proof.id,
      paymentId: payment.id,
      transactionCode: transaction.code,
      declaredAmount: proof.amount.toString(),
      amount: approvedAmount.toString(),
      obligation: {
        paidAmount: updatedObligation.paidAmount.toString(),
        targetAmount: updatedObligation.targetAmount.toString(),
        status: updatedObligation.status,
      },
    }
  })

  realtimeEventBus.emitClassEvent(classId, {
    type: "PROOF_APPROVED",
    proofId: result.proofId,
    amount: result.amount,
    status: result.obligation.status,
  })

  return result
}

// 8. Thủ quỹ duyệt bill hàng loạt (Batch Approve - Thứ tự khóa nhất quán)
export async function batchApproveProofs(params: {
  classId: string
  proofIds: string[]
  actorId: string
  actorMemberId: string
}) {
  const { classId, proofIds, actorId, actorMemberId } = params

  // Sắp xếp IDs nhất quán để chống deadlock khi nhiều luồng duyệt
  const sortedIds = [...new Set(proofIds)].sort()

  const results: Array<{ proofId: string; success: boolean; error?: string }> = []

  for (const pId of sortedIds) {
    try {
      await approvePaymentProof({
        classId,
        proofId: pId,
        actorId,
        actorMemberId,
      })
      results.push({ proofId: pId, success: true })
    } catch (err) {
      results.push({
        proofId: pId,
        success: false,
        error: err instanceof Error ? err.message : "Duyệt thất bại",
      })
    }
  }

  const successCount = results.filter((r) => r.success).length
  return {
    total: sortedIds.length,
    successCount,
    failedCount: sortedIds.length - successCount,
    details: results,
  }
}

// 9. Thủ quỹ từ chối bill chuyển khoản
export async function rejectPaymentProof(params: {
  classId: string
  proofId: string
  rejectReason: string
  actorId: string
  actorMemberId: string
}) {
  const { classId, proofId, rejectReason, actorId, actorMemberId } = params

  const proof = await prisma.paymentProof.findFirst({
    where: { id: proofId, collection: { classId } },
  })

  if (!proof) {
    throw new AppError(404, "Không tìm thấy bằng chứng chuyển khoản.")
  }

  if (proof.status !== "PENDING") {
    throw new AppError(
      400,
      `Chỉ có thể từ chối bằng chứng đang ở trạng thái Chờ duyệt (Trạng thái hiện tại: ${proof.status}).`,
    )
  }

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.paymentProof.update({
      where: { id: proof.id },
      data: {
        status: "REJECTED",
        rejectReason,
        reviewedById: actorMemberId,
        reviewedAt: new Date(),
      },
    })

    await tx.auditLog.create({
      data: {
        classId,
        actorId,
        action: "REJECT",
        targetType: "PAYMENT_PROOF",
        targetId: proof.id,
        newValues: { status: "REJECTED", rejectReason },
        reason: `Thủ quỹ từ chối bill chuyển khoản: ${rejectReason}`,
      },
    })

    return p
  })

  realtimeEventBus.emitClassEvent(classId, {
    type: "PROOF_REJECTED",
    proofId: updated.id,
    rejectReason: updated.rejectReason,
  })

  return {
    proofId: updated.id,
    status: updated.status,
    rejectReason: updated.rejectReason,
  }
}

// 10. Ghi nhận đóng tiền mặt (Đơn lẻ - Idempotency & Concurrency safe)
export async function recordCashPayment(params: {
  classId: string
  collectionId: string
  classMemberId: string
  amount: string
  note?: string
  idempotencyKey?: string
  actorId: string
  actorMemberId: string
}) {
  const {
    classId,
    collectionId,
    classMemberId,
    amount,
    note,
    idempotencyKey,
    actorId,
    actorMemberId,
  } = params

  const payloadHash = hashPayload({ collectionId, classMemberId, amount, note })

  // 1. Kiểm tra Idempotency chống ghi tiền mặt trùng
  if (idempotencyKey) {
    const existingPayment = await prisma.payment.findUnique({
      where: { idempotencyKey },
      include: { transaction: true },
    })

    if (existingPayment) {
      if (existingPayment.requestHash === payloadHash) {
        return {
          paymentId: existingPayment.id,
          transactionCode: existingPayment.transaction.code,
          amount: existingPayment.amount.toString(),
          isReplay: true,
        }
      } else {
        throw new AppError(
          409,
          "Idempotency key này đã được sử dụng cho một khoản thu tiền mặt khác.",
        )
      }
    }
  }

  const amountBigInt = BigInt(amount)

  const result = await prisma.$transaction(async (tx) => {
    // 2. Khóa dòng nghĩa vụ bằng FOR UPDATE để chống Lost Update khi nhiều luồng cập nhật cùng lúc
    await tx.$executeRaw`SELECT id FROM "CollectionMember" WHERE "collectionId" = ${collectionId} AND "classMemberId" = ${classMemberId} FOR UPDATE`

    const obligation = await tx.collectionMember.findUnique({
      where: { collectionId_classMemberId: { collectionId, classMemberId } },
      include: {
        collection: { select: { id: true, periodId: true, name: true, classId: true } },
        classMember: { select: { id: true, memberCode: true, displayName: true } },
      },
    })

    if (!obligation || obligation.collection.classId !== classId) {
      throw new AppError(404, "Không tìm thấy nghĩa vụ đóng quỹ của thành viên này trong lớp.")
    }

    // 3. Sinh mã bút toán sổ cái duy nhất
    const code = `THU-TM-${Date.now().toString().slice(-6)}`

    // 4. Ghi bút toán vào Sổ cái (Ledger - CASH)
    const transaction = await tx.transaction.create({
      data: {
        classId,
        periodId: obligation.collection.periodId,
        code,
        date: new Date(),
        type: "COLLECTION_FEE",
        fundType: "CASH",
        amount: amountBigInt,
        category: obligation.collection.name,
        description: `Thu tiền mặt đợt: ${obligation.collection.name} - ${obligation.classMember.displayName} (${obligation.classMember.memberCode})${note ? ` - ${note}` : ""}`,
        counterparty: obligation.classMember.displayName,
      },
    })

    // 5. Tạo khoản thanh toán Payment
    const payment = await tx.payment.create({
      data: {
        collectionId,
        classMemberId,
        obligationId: obligation.id,
        amount: amountBigInt,
        fundType: "CASH",
        transactionId: transaction.id,
        recordedById: actorMemberId,
        note,
        idempotencyKey,
        requestHash: payloadHash,
      },
    })

    // 6. Cập nhật cache đóng ròng và trạng thái nghĩa vụ
    const newPaidAmount = obligation.paidAmount + amountBigInt
    let newStatus: ObligationStatus = obligation.status
    if (obligation.status !== "EXEMPT") {
      if (newPaidAmount >= obligation.targetAmount) {
        newStatus = "PAID"
      } else if (newPaidAmount > 0n) {
        newStatus = "PARTIAL"
      }
    }

    const updatedObligation = await tx.collectionMember.update({
      where: { id: obligation.id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    })

    // 7. Ghi Audit Log
    await tx.auditLog.create({
      data: {
        classId,
        actorId,
        action: "CREATE",
        targetType: "PAYMENT",
        targetId: payment.id,
        newValues: {
          paymentId: payment.id,
          transactionId: transaction.id,
          amount: amount,
          fundType: "CASH",
          memberCode: obligation.classMember.memberCode,
        },
        reason: "Thủ quỹ thu và ghi nhận tiền mặt trực tiếp",
      },
    })

    return {
      paymentId: payment.id,
      transactionCode: transaction.code,
      amount: amount,
      obligation: {
        paidAmount: updatedObligation.paidAmount.toString(),
        targetAmount: updatedObligation.targetAmount.toString(),
        status: updatedObligation.status,
      },
      isReplay: false,
    }
  })

  realtimeEventBus.emitClassEvent(classId, {
    type: "CASH_RECORDED",
    collectionId,
    classMemberId,
    amount: result.amount,
    status: result.obligation?.status,
  })

  return result
}

// 11. Ghi nhận tiền mặt hàng loạt
export async function recordCashBatch(params: {
  classId: string
  collectionId: string
  items: Array<{ classMemberId: string; amount: string; note?: string }>
  idempotencyKey?: string
  actorId: string
  actorMemberId: string
}) {
  const { classId, collectionId, items, idempotencyKey, actorId, actorMemberId } = params

  // Sắp xếp items theo classMemberId nhất quán
  const sortedItems = [...items].sort((a, b) => a.classMemberId.localeCompare(b.classMemberId))

  const results: Array<{ classMemberId: string; success: boolean; paymentId?: string; error?: string }> =
    []

  for (const item of sortedItems) {
    try {
      const itemKey = idempotencyKey ? `${idempotencyKey}_${item.classMemberId}` : undefined
      const res = await recordCashPayment({
        classId,
        collectionId,
        classMemberId: item.classMemberId,
        amount: item.amount,
        note: item.note,
        idempotencyKey: itemKey,
        actorId,
        actorMemberId,
      })
      results.push({ classMemberId: item.classMemberId, success: true, paymentId: res.paymentId })
    } catch (err) {
      results.push({
        classMemberId: item.classMemberId,
        success: false,
        error: err instanceof Error ? err.message : "Ghi nhận thất bại",
      })
    }
  }

  const successCount = results.filter((r) => r.success).length
  return {
    total: sortedItems.length,
    successCount,
    failedCount: sortedItems.length - successCount,
    details: results,
  }
}

// 12. Danh sách Proofs trong đợt thu hoặc lớp
export async function getProofs(params: {
  classId: string
  collectionId?: string
  status?: "PENDING" | "APPROVED" | "REJECTED"
  user: { userId: string; classRole?: string; memberId?: string; globalRole: string }
}) {
  const { classId, collectionId, status, user } = params

  const where: any = {
    collection: { classId },
  }

  if (collectionId) {
    where.collectionId = collectionId
  }

  if (status) {
    where.status = status
  }

  // Phân quyền: MEMBER chỉ xem được bill của chính mình
  const isTreasurerOrAdmin =
    user.globalRole === "SUPER_ADMIN" || user.classRole === "TREASURER"
  if (!isTreasurerOrAdmin) {
    where.classMemberId = user.memberId
  }

  const proofs = await prisma.paymentProof.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      file: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } },
      classMember: {
        select: {
          id: true,
          memberCode: true,
          displayName: true,
          user: { select: { email: true, avatarUrl: true } },
        },
      },
      collection: { select: { id: true, name: true, defaultAmount: true } },
      payment: { select: { id: true, paidAt: true, transactionId: true } },
    },
  })

  return proofs.map((p) => ({
    id: p.id,
    collectionId: p.collectionId,
    collectionName: p.collection.name,
    classMemberId: p.classMemberId,
    memberCode: p.classMember.memberCode,
    displayName: p.classMember.displayName,
    email: p.classMember.user.email,
    avatarUrl: p.classMember.user.avatarUrl,
    amount: p.amount.toString(),
    status: p.status,
    transferCode: p.transferCode,
    note: p.note,
    rejectReason: p.rejectReason,
    createdAt: p.createdAt,
    reviewedAt: p.reviewedAt,
    file: p.file,
    bankSnapshot: p.bankSnapshot,
    paymentId: p.payment?.id,
  }))
}
