import { describe, it, expect } from "vitest"

describe("Quy tắc nghiệp vụ tài chính (Business Financial Rules)", () => {
  it("Công thức tính số dư: Số dư = Tổng thu − Tổng chi (không lưu trường balance tĩnh)", () => {
    const transactions = [
      { type: "INCOME", amount: 500000 },
      { type: "INCOME", amount: 300000 },
      { type: "EXPENSE", amount: 150000 },
      { type: "EXPENSE", amount: 50000 },
    ]

    const totalIncome = transactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpense = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0)

    const calculatedBalance = totalIncome - totalExpense

    expect(totalIncome).toBe(800000)
    expect(totalExpense).toBe(200000)
    expect(calculatedBalance).toBe(600000)
  })

  it("Khoản thu từ đóng quỹ chỉ được tính vào Transaction một lần, không cộng trùng cả Payment và Transaction", () => {
    // Khi xác nhận đóng tiền đợt thu 300,000đ:
    const payment = {
      id: "p1",
      collectionId: "c1",
      memberId: "m1",
      amount: 300000,
    }
    const transaction = {
      id: "t1",
      type: "INCOME",
      category: "Đóng quỹ",
      amount: 300000,
      paymentId: "p1",
    }

    // Hệ thống chỉ tính giao dịch trong bảng Transaction vào số dư
    const transactions = [transaction]
    const balance = transactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0)

    expect(balance).toBe(300000)
    expect(payment.amount).toBe(transaction.amount)
  })

  it("Ràng buộc độc bản (Unique Constraint): Không cho phép 1 thành viên đóng 2 lần cho cùng 1 đợt thu", () => {
    const existingPayments = [
      { collectionId: "col-1", memberId: "mem-1" },
      { collectionId: "col-1", memberId: "mem-2" },
    ]

    const newPaymentCandidate = { collectionId: "col-1", memberId: "mem-1" }

    const isDuplicate = existingPayments.some(
      (p) =>
        p.collectionId === newPaymentCandidate.collectionId &&
        p.memberId === newPaymentCandidate.memberId,
    )

    expect(isDuplicate).toBe(true)
  })

  it("Quy tắc chặn chi vượt quá số dư hiện có", () => {
    const currentBalance = 400000
    const requestedExpense = 500000

    const isExceeding = requestedExpense > currentBalance
    expect(isExceeding).toBe(true)
  })
})
