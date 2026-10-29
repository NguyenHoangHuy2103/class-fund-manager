import { describe, it, expect } from "vitest"
import { createCollectionSchema } from "../src/modules/collections/collections.schema.js"
import {
  createExpenseSchema,
  createManualIncomeSchema,
} from "../src/modules/transactions/transactions.schema.js"
import { createMemberSchema } from "../src/modules/members/members.schema.js"

describe("Quy tắc xác thực dữ liệu đầu vào (Zod Validation)", () => {
  describe("Xác thực số tiền VND", () => {
    it("Chấp nhận số tiền nguyên dương hợp lệ", () => {
      const validCollection = createCollectionSchema.safeParse({
        name: "Quỹ lớp tháng 10",
        amount: 150000,
      })
      expect(validCollection.success).toBe(true)
    })

    it("Từ chối số tiền âm", () => {
      const invalidCollection = createCollectionSchema.safeParse({
        name: "Quỹ lớp tháng 10",
        amount: -50000,
      })
      expect(invalidCollection.success).toBe(false)
      if (!invalidCollection.success) {
        expect(invalidCollection.error.errors[0].message).toContain(
          "phải lớn hơn 0",
        )
      }
    })

    it("Từ chối số tiền bằng 0", () => {
      const invalidExpense = createExpenseSchema.safeParse({
        category: "Hoạt động",
        amount: 0,
        description: "Mua nước ngọt",
        counterparty: "Cửa hàng tạp hóa",
      })
      expect(invalidExpense.success).toBe(false)
      if (!invalidExpense.success) {
        expect(invalidExpense.error.errors[0].message).toContain(
          "phải lớn hơn 0",
        )
      }
    })

    it("Từ chối số tiền thập phân (float)", () => {
      const floatExpense = createExpenseSchema.safeParse({
        category: "Hoạt động",
        amount: 100000.5,
        description: "Mua văn phòng phẩm",
        counterparty: "Nhà sách",
      })
      expect(floatExpense.success).toBe(false)
      if (!floatExpense.success) {
        expect(floatExpense.error.errors[0].message).toContain(
          "phải là số nguyên (VND)",
        )
      }
    })

    it("Từ chối số tiền vượt quá giới hạn tối đa", () => {
      const excessIncome = createManualIncomeSchema.safeParse({
        category: "Tài trợ",
        amount: 999_999_999, // Vượt quá 100tr
        description: "Tài trợ khủng",
        counterparty: "Doanh nghiệp",
      })
      expect(excessIncome.success).toBe(false)
    })
  })

  describe("Xác thực thông tin thành viên", () => {
    it("Từ chối email sai định dạng", () => {
      const result = createMemberSchema.safeParse({
        code: "SE190299",
        name: "Nguyễn Văn A",
        email: "email-khong-hop-le",
      })
      expect(result.success).toBe(false)
    })

    it("Tự động viết hoa mã thành viên (code)", () => {
      const result = createMemberSchema.safeParse({
        code: "se190299",
        name: "Nguyễn Văn A",
        email: "a.nv@lopse1902.edu.vn",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.code).toBe("SE190299")
      }
    })

    it("Từ chối số điện thoại không bắt đầu bằng 0 hoặc không đủ 10 chữ số", () => {
      const invalidPhone = createMemberSchema.safeParse({
        code: "SE190299",
        name: "Nguyễn Văn A",
        email: "a.nv@lopse1902.edu.vn",
        phone: "123456789",
      })
      expect(invalidPhone.success).toBe(false)
    })
  })
})
