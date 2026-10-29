import { describe, it, expect } from "vitest"
import crypto from "crypto"

function hashPayload(payload: unknown): string {
  return crypto
    .createHash("sha256")
    .update(typeof payload === "string" ? payload : JSON.stringify(payload))
    .digest("hex")
}

describe("GĐ2 Core Money - Tính toán tiền tệ & Quy tắc kinh doanh", () => {
  describe("1. Công thức Đóng ròng, Còn thiếu, Tiền dư & 4 Trạng thái nghĩa vụ", () => {
    function computeObligationState(
      targetAmountStr: string,
      totalReceivedStr: string,
      totalRefundedStr: string,
      isExempt = false,
    ) {
      const target = BigInt(targetAmountStr)
      const received = BigInt(totalReceivedStr)
      const refunded = BigInt(totalRefundedStr)

      // Đóng ròng (Net paid) = Tổng đã nhận - Tổng đã hoàn
      const netPaid = received > refunded ? received - refunded : 0n
      const remaining = target > netPaid ? target - netPaid : 0n
      const overpaid = netPaid > target ? netPaid - target : 0n

      let status: "UNPAID" | "PARTIAL" | "PAID" | "EXEMPT" = "UNPAID"
      if (isExempt || target === 0n) {
        status = "EXEMPT"
      } else if (netPaid >= target) {
        status = "PAID"
      } else if (netPaid > 0n) {
        status = "PARTIAL"
      }

      return {
        targetAmount: target.toString(),
        totalReceived: received.toString(),
        totalRefunded: refunded.toString(),
        netPaidAmount: netPaid.toString(),
        remainingAmount: remaining.toString(),
        overpaidAmount: overpaid.toString(),
        status,
      }
    }

    it("Chưa đóng tiền: target=100.000, received=0 -> UNPAID, còn thiếu 100.000, dư 0", () => {
      const res = computeObligationState("100000", "0", "0")
      expect(res.status).toBe("UNPAID")
      expect(res.netPaidAmount).toBe("0")
      expect(res.remainingAmount).toBe("100000")
      expect(res.overpaidAmount).toBe("0")
    })

    it("Đóng từng phần: target=100.000, received=40.000 -> PARTIAL, còn thiếu 60.000, dư 0", () => {
      const res = computeObligationState("100000", "40000", "0")
      expect(res.status).toBe("PARTIAL")
      expect(res.netPaidAmount).toBe("40000")
      expect(res.remainingAmount).toBe("60000")
      expect(res.overpaidAmount).toBe("0")
    })

    it("Đóng đủ: target=100.000, received=100.000 -> PAID, còn thiếu 0, dư 0", () => {
      const res = computeObligationState("100000", "100000", "0")
      expect(res.status).toBe("PAID")
      expect(res.netPaidAmount).toBe("100000")
      expect(res.remainingAmount).toBe("0")
      expect(res.overpaidAmount).toBe("0")
    })

    it("Đóng dư: target=100.000, received=150.000 -> PAID, còn thiếu 0, hiển thị dư 50.000", () => {
      const res = computeObligationState("100000", "150000", "0")
      expect(res.status).toBe("PAID") // Giữ đúng 4 trạng thái, không sinh OVERPAID status
      expect(res.netPaidAmount).toBe("150000")
      expect(res.remainingAmount).toBe("0")
      expect(res.overpaidAmount).toBe("50000")
    })

    it("Khi có hoàn tiền: target=100.000, received=100.000, refunded=40.000 -> đóng ròng=60.000 -> PARTIAL", () => {
      const res = computeObligationState("100000", "100000", "40000")
      expect(res.status).toBe("PARTIAL")
      expect(res.netPaidAmount).toBe("60000")
      expect(res.remainingAmount).toBe("40000")
      expect(res.overpaidAmount).toBe("0")
    })

    it("Miễn giảm 100%: target=0 -> EXEMPT, còn thiếu 0", () => {
      const res = computeObligationState("0", "0", "0", true)
      expect(res.status).toBe("EXEMPT")
      expect(res.netPaidAmount).toBe("0")
      expect(res.remainingAmount).toBe("0")
    })
  })

  describe("2. Logic sinh VietQR Napas247 định danh gọn & kiểm soát cấu hình", () => {
    function generateVietQrUrl(params: {
      bankBin?: string | null
      bankAccountNo?: string | null
      bankAccountHolder?: string | null
      classCode: string
      memberCode: string
      collectionId: string
      payAmount: bigint
    }) {
      const {
        bankBin,
        bankAccountNo,
        bankAccountHolder,
        classCode,
        memberCode,
        collectionId,
        payAmount,
      } = params

      if (!bankBin || !bankAccountNo || !bankAccountHolder) {
        return {
          hasBankConfig: false,
          message: "Lớp học chưa cấu hình tài khoản ngân hàng nhận tiền quỹ.",
        }
      }

      const shortCol = collectionId.slice(-6).toUpperCase()
      const transferContent = `CF ${classCode} ${memberCode} ${shortCol}`.trim()
      const qrImageUrl = `https://img.vietqr.io/image/${bankBin}-${bankAccountNo}-compact2.png?amount=${payAmount.toString()}&addInfo=${encodeURIComponent(
        transferContent,
      )}&accountName=${encodeURIComponent(bankAccountHolder)}`

      return {
        hasBankConfig: true,
        transferContent,
        qrImageUrl,
        amount: payAmount.toString(),
      }
    }

    it("Từ chối sinh QR khi lớp chưa cấu hình ngân hàng", () => {
      const res = generateVietQrUrl({
        bankBin: null,
        bankAccountNo: null,
        bankAccountHolder: null,
        classCode: "K15",
        memberCode: "20210001",
        collectionId: "clq123456",
        payAmount: 50000n,
      })

      expect(res.hasBankConfig).toBe(false)
      expect(res.qrImageUrl).toBeUndefined()
    })

    it("Sinh đúng URL VietQR Napas247 và nội dung định danh chuẩn khi có cấu hình", () => {
      const res = generateVietQrUrl({
        bankBin: "970422",
        bankAccountNo: "0987654321",
        bankAccountHolder: "NGUYEN VAN THU QUY",
        classCode: "CNTT-K15",
        memberCode: "20210001",
        collectionId: "clq123456789ABC",
        payAmount: 75000n,
      })

      expect(res.hasBankConfig).toBe(true)
      expect(res.transferContent).toBe("CF CNTT-K15 20210001 789ABC")
      expect(res.qrImageUrl).toContain("970422-0987654321-compact2.png")
      expect(res.qrImageUrl).toContain("amount=75000")
      expect(res.qrImageUrl).toContain("NGUYEN%20VAN%20THU%20QUY")
    })
  })

  describe("3. Quy tắc Idempotency (Cùng key, cùng payload vs khác payload)", () => {
    it("Cùng key, cùng payload nhận diện đúng là Replay hợp lệ", () => {
      const payload = {
        collectionId: "col-1",
        classMemberId: "mem-1",
        amount: "50000",
        fileId: "file-123",
      }
      const hash1 = hashPayload(payload)
      const hash2 = hashPayload({ ...payload })

      expect(hash1).toBe(hash2)
    })

    it("Cùng key, khác payload phát hiện xung đột chính xác", () => {
      const payload1 = {
        collectionId: "col-1",
        classMemberId: "mem-1",
        amount: "50000",
        fileId: "file-123",
      }
      const payload2 = {
        collectionId: "col-1",
        classMemberId: "mem-1",
        amount: "100000", // Khác số tiền
        fileId: "file-123",
      }
      const hash1 = hashPayload(payload1)
      const hash2 = hashPayload(payload2)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe("4. Phân quyền xem bằng chứng chuyển khoản (Private Bill Access)", () => {
    function canViewBill(
      user: { userId: string; classId?: string; classRole?: string; globalRole: string },
      bill: { classId: string; uploadedById: string },
    ): boolean {
      if (user.globalRole === "SUPER_ADMIN") return true
      if (user.classId !== bill.classId) return false
      // Chỉ người nộp HOẶC thủ quỹ lớp mới được xem
      return user.userId === bill.uploadedById || user.classRole === "TREASURER"
    }

    const bill = {
      classId: "class-A",
      uploadedById: "user-student-1",
    }

    it("Người nộp bill xem được bill của chính mình", () => {
      expect(canViewBill({ userId: "user-student-1", classId: "class-A", classRole: "MEMBER", globalRole: "USER" }, bill)).toBe(true)
    })

    it("Thủ quỹ cùng lớp xem được bill của thành viên", () => {
      expect(canViewBill({ userId: "user-treasurer", classId: "class-A", classRole: "TREASURER", globalRole: "USER" }, bill)).toBe(true)
    })

    it("Thành viên khác cùng lớp KHÔNG được xem bill của bạn", () => {
      expect(canViewBill({ userId: "user-student-2", classId: "class-A", classRole: "MEMBER", globalRole: "USER" }, bill)).toBe(false)
    })

    it("Thủ quỹ lớp B KHÔNG được xem bill của lớp A", () => {
      expect(canViewBill({ userId: "user-treasurer-b", classId: "class-B", classRole: "TREASURER", globalRole: "USER" }, bill)).toBe(false)
    })
  })
})
