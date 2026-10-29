import { describe, it, expect } from "vitest"
import { registerSchema } from "../src/modules/auth/auth.schema.js"
import { createClassSchema, joinClassSchema } from "../src/modules/classes/classes.schema.js"
import { listMembersQuerySchema } from "../src/modules/members/members.schema.js"

describe("Quy tắc xác thực dữ liệu đầu vào GĐ1 (Zod Validation)", () => {
  describe("Xác thực Đăng ký & Đăng nhập", () => {
    it("Chấp nhận tài khoản hợp lệ", () => {
      const valid = registerSchema.safeParse({
        email: "student@school.edu.vn",
        password: "StrongPassword@123",
        fullName: "Nguyễn Văn A",
      })
      expect(valid.success).toBe(true)
    })

    it("Từ chối email sai định dạng", () => {
      const invalid = registerSchema.safeParse({
        email: "invalid-email-format",
        password: "Pass",
        fullName: "A",
      })
      expect(invalid.success).toBe(false)
    })

    it("Từ chối mật khẩu quá ngắn", () => {
      const invalid = registerSchema.safeParse({
        email: "test@domain.com",
        password: "123",
        fullName: "Nguyễn Văn A",
      })
      expect(invalid.success).toBe(false)
    })
  })

  describe("Xác thực Tạo lớp & Tham gia lớp", () => {
    it("Chấp nhận thông tin tạo lớp hợp lệ", () => {
      const valid = createClassSchema.safeParse({
        code: "CNTT_K15",
        name: "Lớp Công Nghệ Thông Tin K15",
        memberCode: "MSSV12345",
        displayName: "Trần Bảo Ngọc",
      })
      expect(valid.success).toBe(true)
    })

    it("Từ chối mã lớp chứa ký tự đặc biệt không hợp lệ", () => {
      const invalid = createClassSchema.safeParse({
        code: "CNTT K15@#$",
        name: "Lớp CNTT",
        memberCode: "MSSV1",
        displayName: "Ngọc",
      })
      expect(invalid.success).toBe(false)
    })

    it("Chấp nhận mã mời và thông tin tham gia lớp", () => {
      const valid = joinClassSchema.safeParse({
        inviteCode: "K15DEMO",
        memberCode: "SE190203",
        displayName: "Lê Hoàng Anh",
      })
      expect(valid.success).toBe(true)
    })
  })

  describe("Xác thực bộ lọc thành viên", () => {
    it("Chấp nhận các trạng thái hợp lệ", () => {
      const valid = listMembersQuerySchema.safeParse({
        status: "PENDING",
        page: "1",
        limit: "20",
      })
      expect(valid.success).toBe(true)
      if (valid.success) {
        expect(valid.data.page).toBe(1)
        expect(valid.data.limit).toBe(20)
      }
    })
  })
})
