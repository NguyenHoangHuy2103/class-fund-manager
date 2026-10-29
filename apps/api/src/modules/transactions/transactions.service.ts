import { prisma } from "../../lib/prisma.js"
import { AppError } from "../../middleware/error.middleware.js"
import type { TransactionType } from "@prisma/client"

export async function getFundBalance() {
  const [incomes, expenses] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "INCOME" },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "EXPENSE" },
    }),
  ])

  const totalIncome = incomes._sum.amount || 0
  const totalExpense = expenses._sum.amount || 0
  const balance = totalIncome - totalExpense

  return {
    totalIncome,
    totalExpense,
    balance,
  }
}

export async function listTransactions(params: {
  type?: "INCOME" | "EXPENSE" | "ALL"
  category?: string
  fromDate?: string
  toDate?: string
  search?: string
  page: number
  limit: number
}) {
  const { type, category, fromDate, toDate, search, page, limit } = params
  const skip = (page - 1) * limit

  const where: any = {}

  if (type && type !== "ALL") {
    where.type = (type as TransactionType)
  }

  if (category && category !== "ALL") {
    where.category = category
  }

  if (fromDate || toDate) {
    where.date = {}
    if (fromDate) {
      where.date.gte = new Date(fromDate)
    }
    if (toDate) {
      const end = new Date(toDate)
      end.setHours(23, 59, 59, 999)
      where.date.lte = end
    }
  }

  if (search && search.trim()) {
    const q = search.trim()
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { counterparty: { contains: q, mode: "insensitive" } },
    ]
  }

  const [total, transactions, balanceSummary] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: "desc" },
      include: {
        createdBy: {
          select: { id: true, email: true },
        },
        payment: {
          select: {
            id: true,
            collectionId: true,
            memberId: true,
            collection: { select: { id: true, name: true } },
            member: { select: { id: true, name: true, code: true } },
          },
        },
      },
    }),
    getFundBalance(),
  ])

  return {
    items: transactions,
    summary: balanceSummary,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

export async function getTransactionById(id: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, email: true },
      },
      payment: {
        include: {
          collection: { select: { id: true, name: true } },
          member: { select: { id: true, name: true, code: true } },
        },
      },
    },
  })

  if (!transaction) {
    throw new AppError(404, "Không tìm thấy giao dịch này.")
  }

  return transaction
}

export async function createExpense(
  data: {
    category: string
    amount: number
    date?: string
    description: string
    counterparty: string
    note?: string
  },
  adminUserId: string,
) {
  // 1. Kiểm tra số dư quỹ: Không cho phép chi vượt quá số dư hiện có
  const { balance } = await getFundBalance()
  if (data.amount > balance) {
    const formattedBalance =
      new Intl.NumberFormat("vi-VN").format(balance) + " ₫"
    const formattedAmount =
      new Intl.NumberFormat("vi-VN").format(data.amount) + " ₫"
    throw new AppError(
      400,
      `Số dư quỹ hiện tại không đủ (${formattedBalance}) để thực hiện khoản chi này (${formattedAmount}).`,
    )
  }

  // 2. Tạo mã giao dịch tự động
  const txCount = await prisma.transaction.count()
  const code = `GD-${String(txCount + 1).padStart(4, "0")}`

  return prisma.transaction.create({
    data: {
      code,
      type: "EXPENSE",
      category: data.category,
      amount: data.amount,
      date: data.date ? new Date(data.date) : new Date(),
      description: data.description,
      counterparty: data.counterparty,
      note: data.note || null,
      createdById: adminUserId,
    },
  })
}

export async function createManualIncome(
  data: {
    category: string
    amount: number
    date?: string
    description: string
    counterparty: string
    note?: string
  },
  adminUserId: string,
) {
  // Tạo mã giao dịch tự động
  const txCount = await prisma.transaction.count()
  const code = `GD-${String(txCount + 1).padStart(4, "0")}`

  return prisma.transaction.create({
    data: {
      code,
      type: "INCOME",
      category: data.category,
      amount: data.amount,
      date: data.date ? new Date(data.date) : new Date(),
      description: data.description,
      counterparty: data.counterparty,
      note: data.note || null,
      createdById: adminUserId,
    },
  })
}
