import { prisma } from "../../lib/prisma.js"
import { getFundBalance } from "../transactions/transactions.service.js"
import type { Role } from "@prisma/client"

export async function getDashboardSummary(params: {
  userId: string
  role: Role
  memberId?: string
}) {
  const { memberId } = params

  const [fundBalance, openCollections, recentTransactions, totalActiveMembers] =
    await Promise.all([
      getFundBalance(),
      prisma.collection.findMany({
        where: { status: "OPEN" },
        orderBy: { createdAt: "desc" },
        include: {
          payments: {
            select: { id: true, memberId: true, amount: true },
          },
        },
      }),
      prisma.transaction.findMany({
        take: 6,
        orderBy: { date: "desc" },
        select: {
          id: true,
          code: true,
          type: true,
          category: true,
          amount: true,
          date: true,
          description: true,
          counterparty: true,
        },
      }),
      prisma.member.count({ where: { status: "ACTIVE" } }),
    ])

  // Tính số tiền cá nhân còn phải đóng (nếu là member)
  let myUnpaidAmount = 0
  let myUnpaidCollectionsCount = 0

  if (memberId) {
    for (const col of openCollections) {
      const hasPaid = col.payments.some((p) => p.memberId === memberId)
      if (!hasPaid) {
        myUnpaidAmount += col.amount
        myUnpaidCollectionsCount++
      }
    }
  }

  // Tổng tiền còn phải thu của cả lớp từ các đợt đang mở
  let totalClassRemainingToCollect = 0
  const openCollectionsSummary = openCollections.map((col) => {
    const paidCount = col.payments.length
    const collected = col.payments.reduce((sum, p) => sum + p.amount, 0)
    const target = col.amount * totalActiveMembers
    const remaining = Math.max(0, target - collected)
    totalClassRemainingToCollect += remaining

    return {
      id: col.id,
      name: col.name,
      amount: col.amount,
      dueDate: col.dueDate,
      paidCount,
      totalMembers: totalActiveMembers,
      collected,
      target,
      remaining,
      percent: target > 0 ? Math.round((collected / target) * 100) : 0,
      hasMyPayment: memberId
        ? col.payments.some((p) => p.memberId === memberId)
        : false,
    }
  })

  return {
    balance: fundBalance.balance,
    totalIncome: fundBalance.totalIncome,
    totalExpense: fundBalance.totalExpense,
    totalActiveMembers,
    myUnpaid: {
      amount: myUnpaidAmount,
      count: myUnpaidCollectionsCount,
    },
    totalClassRemainingToCollect,
    openCollections: openCollectionsSummary,
    recentTransactions,
  }
}
