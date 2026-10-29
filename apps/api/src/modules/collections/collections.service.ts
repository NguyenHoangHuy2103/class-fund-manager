import { prisma } from "../../lib/prisma.js"
import { AppError } from "../../middleware/error.middleware.js"
import type { CollectionStatus, Role } from "@prisma/client"

export async function listCollections(params: {
  status?: "OPEN" | "CLOSED" | "ALL"
  page: number
  limit: number
  userId: string
  role: Role
  memberId?: string
}) {
  const { status, page, limit, memberId } = params
  const skip = (page - 1) * limit

  const where: any = {}
  if (status && status !== "ALL") {
    where.status = (status as CollectionStatus)
  }

  const [total, collections, totalActiveMembers] = await Promise.all([
    prisma.collection.count({ where }),
    prisma.collection.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { id: true, email: true },
        },
        payments: {
          select: {
            id: true,
            memberId: true,
            amount: true,
            paidAt: true,
          },
        },
      },
    }),
    prisma.member.count({ where: { status: "ACTIVE" } }),
  ])

  const items = collections.map((col) => {
    const paidCount = col.payments.length
    const totalCollected = col.payments.reduce((sum, p) => sum + p.amount, 0)
    const targetAmount = col.amount * totalActiveMembers
    const myPayment = memberId
      ? col.payments.find((p) => p.memberId === memberId)
      : undefined

    return {
      id: col.id,
      name: col.name,
      description: col.description,
      amount: col.amount,
      dueDate: col.dueDate,
      status: col.status,
      createdAt: col.createdAt,
      paidCount,
      totalMembers: totalActiveMembers,
      totalCollected,
      targetAmount,
      remainingAmount: Math.max(0, targetAmount - totalCollected),
      progressPercent:
        targetAmount > 0
          ? Math.round((totalCollected / targetAmount) * 100)
          : 0,
      myStatus: myPayment ? "PAID" : "UNPAID",
      myPayment: myPayment || null,
    }
  })

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

export async function getCollectionDetail(id: string, memberId?: string) {
  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, email: true },
      },
      payments: {
        include: {
          member: {
            select: { id: true, name: true, code: true, email: true },
          },
          confirmedBy: {
            select: { id: true, email: true },
          },
        },
      },
    },
  })

  if (!collection) {
    throw new AppError(404, "Không tìm thấy đợt đóng quỹ này.")
  }

  // Lấy toàn bộ thành viên đang học để đối chiếu ai đã đóng, ai chưa đóng
  const activeMembers = await prisma.member.findMany({
    where: { status: "ACTIVE" },
    orderBy: { code: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      email: true,
    },
  })

  const paidMap = new Map(collection.payments.map((p) => [p.memberId, p]))

  const membersStatus = activeMembers.map((m) => {
    const payment = paidMap.get(m.id)
    return {
      memberId: m.id,
      name: m.name,
      code: m.code,
      email: m.email,
      status: payment ? "PAID" : "UNPAID",
      payment: payment
        ? {
            id: payment.id,
            amount: payment.amount,
            paidAt: payment.paidAt,
            confirmedBy: payment.confirmedBy.email,
            note: payment.note,
          }
        : null,
    }
  })

  const totalMembers = activeMembers.length
  const paidCount = collection.payments.length
  const totalCollected = collection.payments.reduce(
    (sum, p) => sum + p.amount,
    0,
  )
  const targetAmount = collection.amount * totalMembers
  const myPayment = memberId ? paidMap.get(memberId) : undefined

  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    amount: collection.amount,
    dueDate: collection.dueDate,
    status: collection.status,
    createdAt: collection.createdAt,
    totalMembers,
    paidCount,
    totalCollected,
    targetAmount,
    remainingAmount: Math.max(0, targetAmount - totalCollected),
    progressPercent:
      targetAmount > 0 ? Math.round((totalCollected / targetAmount) * 100) : 0,
    myStatus: myPayment ? "PAID" : "UNPAID",
    members: membersStatus,
  }
}

export async function createCollection(
  data: {
    name: string
    description?: string
    amount: number
    dueDate?: string
  },
  adminUserId: string,
) {
  return prisma.collection.create({
    data: {
      name: data.name,
      description: data.description || null,
      amount: data.amount,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      status: "OPEN",
      createdById: adminUserId,
    },
  })
}

export async function updateCollectionStatus(
  id: string,
  status: "OPEN" | "CLOSED",
) {
  const collection = await prisma.collection.findUnique({ where: { id } })
  if (!collection) {
    throw new AppError(404, "Không tìm thấy đợt đóng quỹ.")
  }

  return prisma.collection.update({
    where: { id },
    data: { status },
  })
}

export async function confirmMemberPayment(params: {
  collectionId: string
  memberId: string
  adminUserId: string
  note?: string
}) {
  const { collectionId, memberId, adminUserId, note } = params

  return prisma.$transaction(async (tx) => {
    // 1. Kiểm tra đợt thu
    const collection = await tx.collection.findUnique({
      where: { id: collectionId },
    })

    if (!collection) {
      throw new AppError(404, "Không tìm thấy đợt đóng quỹ này.")
    }

    if (collection.status !== "OPEN") {
      throw new AppError(
        400,
        "Đợt đóng quỹ này đã được đóng lại, không thể ghi nhận thêm thanh toán.",
      )
    }

    // 2. Kiểm tra thành viên
    const member = await tx.member.findUnique({
      where: { id: memberId },
    })

    if (!member) {
      throw new AppError(404, "Không tìm thấy thành viên.")
    }

    if (member.status !== "ACTIVE") {
      throw new AppError(
        400,
        "Thành viên này hiện đang ở trạng thái ngừng hoạt động.",
      )
    }

    // 3. Chống xác nhận trùng: kiểm tra payment đã tồn tại chưa
    const existing = await tx.payment.findUnique({
      where: {
        collectionId_memberId: {
          collectionId,
          memberId,
        },
      },
    })

    if (existing) {
      throw new AppError(
        400,
        `Thành viên ${member.name} (${member.code}) đã hoàn thành khoản đóng này trước đó. Không thể xác nhận trùng.`,
      )
    }

    // 4. Sinh mã giao dịch tự động dạng GD-XXXX
    const txCount = await tx.transaction.count()
    const code = `GD-${String(txCount + 1).padStart(4, "0")}`

    // 5. Tạo Transaction THU (INCOME) tương ứng
    const transaction = await tx.transaction.create({
      data: {
        code,
        type: "INCOME",
        category: "Đóng quỹ",
        amount: collection.amount,
        date: new Date(),
        description: `${collection.name} – ${member.name} (${member.code})`,
        counterparty: member.name,
        note: note || "Xác nhận thu quỹ",
        createdById: adminUserId,
      },
    })

    // 6. Tạo bản ghi Payment liên kết với Transaction
    const payment = await tx.payment.create({
      data: {
        collectionId,
        memberId,
        amount: collection.amount,
        paidAt: new Date(),
        note: note || null,
        confirmedById: adminUserId,
        transactionId: transaction.id,
      },
      include: {
        member: { select: { id: true, name: true, code: true } },
        collection: { select: { id: true, name: true } },
      },
    })

    return {
      payment,
      transaction,
    }
  })
}
