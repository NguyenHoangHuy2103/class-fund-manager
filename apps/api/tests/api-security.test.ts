import { describe, it, expect } from "vitest"
import request from "supertest"
import { app } from "../src/app.js"
import {
  generateAccessToken,
  generateCsrfToken,
  ACCESS_COOKIE_NAME,
  CSRF_COOKIE_NAME,
} from "../src/lib/auth.js"
import { env } from "../src/config/env.js"
import { GlobalRole, ClassRole } from "@prisma/client"

describe("API Security & Role-based Access Control GĐ1 (RBAC & CSRF)", () => {
  const sessionIdA = "mock-session-id-A"
  const sessionIdB = "mock-session-id-B"

  const memberToken = generateAccessToken({
    userId: "mock-member-user-id",
    email: "member@lopse1902.edu.vn",
    globalRole: GlobalRole.USER,
    classId: "mock-class-id",
    classRole: ClassRole.MEMBER,
    memberId: "mock-member-id",
    sessionId: sessionIdA,
  })

  const pendingUserToken = generateAccessToken({
    userId: "mock-pending-user-id",
    email: "pending@lopse1902.edu.vn",
    globalRole: GlobalRole.USER,
    // Chưa được duyệt vào lớp nên không có classId và classRole
    sessionId: sessionIdA,
  })

  // Token CSRF hợp lệ được ký HMAC và gắn chặt với Session A
  const validCsrfForSessionA = generateCsrfToken(sessionIdA)
  // Token CSRF hợp lệ được ký HMAC và gắn chặt với Session B
  const validCsrfForSessionB = generateCsrfToken(sessionIdB)

  describe("Truy cập khi chưa đăng nhập (Unauthenticated)", () => {
    it("GET /api/members trả về 401 khi không có cookie", async () => {
      const res = await request(app).get("/api/members")
      expect(res.status).toBe(401)
      expect(res.body.ok).toBe(false)
      expect(res.body.error).toContain("Vui lòng đăng nhập")
    })

    it("GET /api/classes/current trả về 401 khi không có cookie", async () => {
      const res = await request(app).get("/api/classes/current")
      expect(res.status).toBe(401)
    })
  })

  describe("Thành viên PENDING/REJECTED/INACTIVE không đọc được dữ liệu quỹ lớp", () => {
    it("User PENDING không đọc được danh sách thành viên lớp (GET /api/members)", async () => {
      const res = await request(app)
        .get("/api/members")
        .set("Cookie", [`${ACCESS_COOKIE_NAME}=${pendingUserToken}`])

      expect(res.status).toBe(403)
      expect(res.body.ok).toBe(false)
      expect(res.body.error).toContain("Bạn không có quyền thực hiện thao tác này trong lớp học.")
    })

    it("User PENDING không có classId trả về 404/403 khi gọi /api/classes/current", async () => {
      const res = await request(app)
        .get("/api/classes/current")
        .set("Cookie", [`${ACCESS_COOKIE_NAME}=${pendingUserToken}`])

      expect(res.status).toBe(404)
      expect(res.body.ok).toBe(false)
      expect(res.body.error).toContain("Bạn chưa tham gia lớp học nào")
    })
  })

  describe("Kiểm soát quyền theo vai trò (MEMBER không được thực hiện quyền TREASURER)", () => {
    it("MEMBER không được phép duyệt thành viên (PATCH /api/members/:id/approve)", async () => {
      const res = await request(app)
        .patch("/api/members/some-id/approve")
        .set("Cookie", [
          `${ACCESS_COOKIE_NAME}=${memberToken}`,
          `${CSRF_COOKIE_NAME}=${validCsrfForSessionA}`,
        ])
        .set("x-csrf-token", validCsrfForSessionA)

      expect(res.status).toBe(403)
      expect(res.body.ok).toBe(false)
      expect(res.body.error).toContain("không có quyền")
    })

    it("MEMBER không được phép từ chối thành viên (PATCH /api/members/:id/reject)", async () => {
      const res = await request(app)
        .patch("/api/members/some-id/reject")
        .set("Cookie", [
          `${ACCESS_COOKIE_NAME}=${memberToken}`,
          `${CSRF_COOKIE_NAME}=${validCsrfForSessionA}`,
        ])
        .set("x-csrf-token", validCsrfForSessionA)

      expect(res.status).toBe(403)
      expect(res.body.ok).toBe(false)
    })

    it("MEMBER không được phép thay đổi mã mời (PATCH /api/classes/invite-code)", async () => {
      const res = await request(app)
        .patch("/api/classes/invite-code")
        .set("Cookie", [
          `${ACCESS_COOKIE_NAME}=${memberToken}`,
          `${CSRF_COOKIE_NAME}=${validCsrfForSessionA}`,
        ])
        .set("x-csrf-token", validCsrfForSessionA)
        .send({ regenerate: true })

      expect(res.status).toBe(403)
      expect(res.body.ok).toBe(false)
    })
  })

  describe("Bảo vệ CSRF toàn diện (Session-bound & Signed HMAC Token)", () => {
    it("Từ chối khi thiếu Header x-csrf-token (HTTP 403)", async () => {
      const res = await request(app)
        .patch("/api/members/some-id/approve")
        .set("Cookie", [
          `${ACCESS_COOKIE_NAME}=${memberToken}`,
          `${CSRF_COOKIE_NAME}=${validCsrfForSessionA}`,
        ])
        // Thiếu header x-csrf-token

      expect(res.status).toBe(403)
      expect(res.body.ok).toBe(false)
      expect(res.body.error).toContain("CSRF")
    })

    it("Từ chối khi Header và Cookie không khớp nhau (HTTP 403)", async () => {
      const res = await request(app)
        .patch("/api/members/some-id/approve")
        .set("Cookie", [
          `${ACCESS_COOKIE_NAME}=${memberToken}`,
          `${CSRF_COOKIE_NAME}=${validCsrfForSessionA}`,
        ])
        .set("x-csrf-token", "wrong-csrf-token-value")

      expect(res.status).toBe(403)
      expect(res.body.ok).toBe(false)
      expect(res.body.error).toContain("CSRF")
    })

    it("TEST BẮT BUỘC: Giữ cookie đăng nhập phiên A, thay cả cookie CSRF và header bằng cùng token hợp lệ của phiên B -> Phải bị chặn (HTTP 403)", async () => {
      // Cookie đăng nhập là của Phiên A (sessionIdA)
      // Cả Cookie CSRF và Header CSRF đều mang token hợp lệ của Phiên B (validCsrfForSessionB)
      // Double submit khớp hoàn toàn, nhưng token KHÔNG gắn với phiên A
      const res = await request(app)
        .patch("/api/members/some-id/approve")
        .set("Cookie", [
          `${ACCESS_COOKIE_NAME}=${memberToken}`,
          `${CSRF_COOKIE_NAME}=${validCsrfForSessionB}`,
        ])
        .set("x-csrf-token", validCsrfForSessionB)

      expect(res.status).toBe(403)
      expect(res.body.ok).toBe(false)
      expect(res.body.error).toContain("không gắn với phiên hiện tại")
    })

    it("Từ chối khi CSRF token bị sửa đổi hoặc giả mạo chữ ký HMAC (HTTP 403)", async () => {
      const tamperedToken = validCsrfForSessionA.slice(0, -6) + "123456"

      const res = await request(app)
        .patch("/api/members/some-id/approve")
        .set("Cookie", [
          `${ACCESS_COOKIE_NAME}=${memberToken}`,
          `${CSRF_COOKIE_NAME}=${tamperedToken}`,
        ])
        .set("x-csrf-token", tamperedToken)

      expect(res.status).toBe(403)
      expect(res.body.ok).toBe(false)
      expect(res.body.error).toContain("chữ ký không hợp lệ")
    })
  })

  describe("Bảo mật Dev Email Preview Endpoint", () => {
    it("Từ chối truy cập /api/dev/emails khi không có header x-dev-key (HTTP 403)", async () => {
      const res = await request(app).get("/api/dev/emails")
      expect(res.status).toBe(403)
      expect(res.body.ok).toBe(false)
      expect(res.body.error).toContain("x-dev-key")
    })

    it("Từ chối truy cập /api/dev/emails khi chỉ gửi cookie người dùng thông thường (HTTP 403)", async () => {
      const res = await request(app)
        .get("/api/dev/emails")
        .set("Cookie", [`${ACCESS_COOKIE_NAME}=${memberToken}`])

      expect(res.status).toBe(403)
      expect(res.body.ok).toBe(false)
      expect(res.body.error).toContain("x-dev-key")
    })

    it("Cho phép truy cập /api/dev/emails khi gửi đúng header x-dev-key (HTTP 200)", async () => {
      const res = await request(app)
        .get("/api/dev/emails")
        .set("x-dev-key", env.DEV_API_KEY)

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(Array.isArray(res.body.data.emails)).toBe(true)
    })
  })
})
