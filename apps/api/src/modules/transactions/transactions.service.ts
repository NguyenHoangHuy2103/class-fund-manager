import { prisma } from "../../lib/prisma.js"
import type { FundType, TransactionType } from "@prisma/client"

export async function listTransactions(params: {
  classId: string
  periodId?: string
  fundType?: FundType
  type?: TransactionType
  page?: number
  limit?: number
}) {
  const { classId, periodId, fundType, type, page = 1, limit = 20 } = params
  const skip = (page - 1) * limit

  const where: any = { classId }
  if (periodId) where.periodId = periodId
  if (fundType) where.fundType = fundType
  if (type) where.type = type

  const [total, items] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        period: { select: { id: true, name: true } },
      },
    }),
  ])

  return {
    items: items.map((t) => ({
      id: t.id,
      code: t.code,
      date: t.date,
      type: t.type,
      fundType: t.fundType,
      amount: t.amount.toString(),
      category: t.category,
      description: t.description,
      counterparty: t.counterparty,
      periodName: t.period.name,
      createdAt: t.createdAt,
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}
