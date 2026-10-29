import { prisma } from "../../lib/prisma.js"
import { AppError } from "../../middleware/error.middleware.js"

export async function getDashboardOverview(
  classId: string,
  user: { userId: string; classRole?: string; memberId?: string; globalRole: string },
) {
  // 1. Kiểm tra lớp học
  const targetClass = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      name: true,
      code: true,
      bankBin: true,
      bankName: true,
      bankAccountNo: true,
      bankAccountHolder: true,
    },
  })

  if (!targetClass) {
    throw new AppError(404, "Không tìm thấy lớp học.")
  }

  // 2. Lấy kỳ đang OPEN
  const currentPeriod = await prisma.period.findFirst({
    where: { classId, status: "OPEN" },
  })

  // 3. TÍNH TOÁN SỐ DƯ TỪ SỔ CÁI (LEDGER SSOT)
  const allTransactions = await prisma.transaction.findMany({
    where: { classId },
    select: {
      type: true,
      fundType: true,
      amount: true,
    },
  })

  const inTypes = [
    "OPENING_BALANCE",
    "COLLECTION_FEE",
    "OTHER_INCOME",
    "INTERNAL_TRANSFER_IN",
  ]
  const outTypes = [
    "EXPENSE",
    "REFUND",
    "INTERNAL_TRANSFER_OUT",
  ]

  let cashBalance = 0n
  let bankBalance = 0n

  for (const t of allTransactions) {
    if (t.fundType === "CASH") {
      if (inTypes.includes(t.type)) cashBalance += t.amount
      else if (outTypes.includes(t.type)) cashBalance -= t.amount
    } else if (t.fundType === "BANK") {
      if (inTypes.includes(t.type)) bankBalance += t.amount
      else if (outTypes.includes(t.type)) bankBalance -= t.amount
    }
  }

  const totalBalance = cashBalance + bankBalance

  // 4. Các đợt thu đang mở
  const activeCollections = await prisma.collection.findMany({
    where: { classId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: {
      members: {
        select: {
          classMemberId: true,
          targetAmount: true,
          paidAmount: true,
          status: true,
        },
      },
    },
  })

  const isTreasurerOrAdmin =
    user.globalRole === "SUPER_ADMIN" || user.classRole === "TREASURER"

  let roleData: any = {}

  if (isTreasurerOrAdmin) {
    // Dữ liệu cho Thủ quỹ
    const pendingProofs = await prisma.paymentProof.findMany({
      where: { collection: { classId }, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 10,
      include: {
        collection: { select: { id: true, name: true } },
        classMember: { select: { id: true, memberCode: true, displayName: true } },
        file: { select: { id: true, originalName: true } },
      },
    })

    const collectionsOverview = activeCollections.map((c) => {
      let targetTotal = 0n
      let collectedTotal = 0n
      for (const m of c.members) {
        targetTotal += m.targetAmount
        collectedTotal += m.paidAmount
      }
      return {
        id: c.id,
        name: c.name,
        defaultAmount: c.defaultAmount.toString(),
        dueDate: c.dueDate,
        totalMembers: c.members.length,
        targetTotal: targetTotal.toString(),
        collectedTotal: collectedTotal.toString(),
        remainingTotal: (targetTotal > collectedTotal ? targetTotal - collectedTotal : 0n).toString(),
      }
    })

    roleData = {
      isTreasurer: true,
      pendingProofCount: pendingProofs.length,
      pendingProofs: pendingProofs.map((p) => ({
        id: p.id,
        collectionId: p.collectionId,
        collectionName: p.collection.name,
        memberCode: p.classMember.memberCode,
        displayName: p.classMember.displayName,
        amount: p.amount.toString(),
        createdAt: p.createdAt,
        fileId: p.file.id,
        transferCode: p.transferCode,
        note: p.note,
      })),
      activeCollections: collectionsOverview,
    }
  } else {
    // Dữ liệu cho Thành viên
    const myObligations = []
    let totalDue = 0n

    for (const c of activeCollections) {
      const myOb = c.members.find((m) => m.classMemberId === user.memberId)
      if (myOb) {
        const remaining = myOb.targetAmount > myOb.paidAmount ? myOb.targetAmount - myOb.paidAmount : 0n
        const overpaid = myOb.paidAmount > myOb.targetAmount ? myOb.paidAmount - myOb.targetAmount : 0n
        totalDue += remaining

        myObligations.push({
          collectionId: c.id,
          collectionName: c.name,
          dueDate: c.dueDate,
          targetAmount: myOb.targetAmount.toString(),
          paidAmount: myOb.paidAmount.toString(),
          remainingAmount: remaining.toString(),
          overpaidAmount: overpaid.toString(),
          status: myOb.status,
        })
      }
    }

    roleData = {
      isTreasurer: false,
      personalTotalDue: totalDue.toString(),
      personalObligations: myObligations,
    }
  }

  // 5. Giao dịch thu chi gần đây
  const recentTransactions = await prisma.transaction.findMany({
    where: { classId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      code: true,
      date: true,
      type: true,
      fundType: true,
      amount: true,
      category: true,
      description: true,
      counterparty: true,
    },
  })

  return {
    classInfo: targetClass,
    currentPeriod: currentPeriod
      ? { id: currentPeriod.id, name: currentPeriod.name, status: currentPeriod.status }
      : null,
    balances: {
      cashBalance: cashBalance.toString(),
      bankBalance: bankBalance.toString(),
      totalBalance: totalBalance.toString(),
    },
    ...roleData,
    recentTransactions: recentTransactions.map((t) => ({
      ...t,
      amount: t.amount.toString(),
    })),
  }
}
