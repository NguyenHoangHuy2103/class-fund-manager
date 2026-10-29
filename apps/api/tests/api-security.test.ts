import { describe, it, expect } from "vitest"
import request from "supertest"
import { app } from "../src/app.js"
import { generateToken } from "../src/lib/auth.js"
import { Role } from "@prisma/client"

describe("API Security & Role-based Access Control (RBAC)", () => {
  const memberToken = generateToken({
    userId: "mock-member-user-id",
    email: "member@lopse1902.edu.vn",
    role: Role.MEMBER,
    memberId: "mock-member-id",
  })

  describe("Truy cập khi chưa đăng nhập (Unauthenticated)", () => {
    it("GET /api/dashboard trả về 401 khi không có token", async () => {
      const res = await request(app).get("/api/dashboard")
      expect(res.status).toBe(401)
      expect(res.body.ok).toBe(false)
      expect(res.body.error).toContain("Vui lòng đăng nhập")
    })

    it("GET /api/members trả về 401 khi không có token", async () => {
      const res = await request(app).get("/api/members")
      expect(res.status).toBe(401)
    })

    it("GET /api/collections trả về 401 khi không có token", async () => {
      const res = await request(app).get("/api/collections")
      expect(res.status).toBe(401)
    })
  })

  describe("Kiểm soát quyền theo vai trò (MEMBER không được thực hiện quyền ADMIN)", () => {
    it("MEMBER không được phép tạo đợt thu mới (POST /api/collections)", async () => {
      const res = await request(app)
        .post("/api/collections")
        .set("Cookie", [`class_fund_token=${memberToken}`])
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          name: "Khoản thu bất hợp pháp",
          amount: 50000,
        })

      expect(res.status).toBe(403)
      expect(res.body.ok).toBe(false)
      expect(res.body.error).toContain("không có quyền")
    })

    it("MEMBER không được phép ghi nhận khoản chi (POST /api/transactions/expenses)", async () => {
      const res = await request(app)
        .post("/api/transactions/expenses")
        .set("Cookie", [`class_fund_token=${memberToken}`])
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          category: "Hoạt động",
          amount: 100000,
          description: "Chi tiêu trái phép",
          counterparty: "Ai đó",
        })

      expect(res.status).toBe(403)
      expect(res.body.ok).toBe(false)
    })

    it("MEMBER không được phép thay đổi trạng thái thành viên (PATCH /api/members/:id/status)", async () => {
      const res = await request(app)
        .patch("/api/members/some-id/status")
        .set("Cookie", [`class_fund_token=${memberToken}`])
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ status: "INACTIVE" })

      expect(res.status).toBe(403)
      expect(res.body.ok).toBe(false)
    })

    it("MEMBER không được phép xác nhận tiền đóng (POST /api/collections/:id/payments)", async () => {
      const res = await request(app)
        .post("/api/collections/col-123/payments")
        .set("Cookie", [`class_fund_token=${memberToken}`])
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ memberId: "member-123" })

      expect(res.status).toBe(403)
      expect(res.body.ok).toBe(false)
    })
  })
})
