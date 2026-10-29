import { describe, it, expect } from "vitest"
import {
  hashPassword,
  comparePassword,
  hashToken,
  generateRandomToken,
  generateAccessToken,
  verifyAccessToken,
} from "../src/lib/auth.js"
import { GlobalRole, ClassRole } from "@prisma/client"

describe("Cơ chế xác thực & Bảo mật (Auth & Security V2)", () => {
  it("Hash mật khẩu đúng và so khớp chính xác bằng bcrypt", async () => {
    const rawPassword = "Matkhau@123"
    const hashed = await hashPassword(rawPassword)

    expect(hashed).not.toBe(rawPassword)
    expect(hashed.startsWith("$2")).toBe(true)

    const isMatch = await comparePassword(rawPassword, hashed)
    expect(isMatch).toBe(true)

    const isWrongMatch = await comparePassword("SaiMatKhau", hashed)
    expect(isWrongMatch).toBe(false)
  })

  it("Hash token bằng SHA-256 một chiều và xác thực", () => {
    const rawToken = generateRandomToken()
    const hashed1 = hashToken(rawToken)
    const hashed2 = hashToken(rawToken)

    expect(hashed1).toBe(hashed2)
    expect(hashed1).toHaveLength(64) // SHA-256 hex length
    expect(hashed1).not.toBe(rawToken)
  })

  it("Tạo và giải mã JWT token chứa đúng payload vai trò (GlobalRole & ClassRole)", () => {
    const payload = {
      userId: "user-123",
      email: "thuquy@lopse1902.edu.vn",
      globalRole: GlobalRole.USER,
      classId: "class-123",
      classRole: ClassRole.TREASURER,
      memberId: "member-123",
      sessionId: "session-123",
    }

    const token = generateAccessToken(payload)
    expect(typeof token).toBe("string")

    const decoded = verifyAccessToken(token)
    expect(decoded.userId).toBe(payload.userId)
    expect(decoded.email).toBe(payload.email)
    expect(decoded.globalRole).toBe(GlobalRole.USER)
    expect(decoded.classRole).toBe(ClassRole.TREASURER)
    expect(decoded.classId).toBe(payload.classId)
  })

  it("Từ chối token bị sửa đổi hoặc sai secret", () => {
    const validToken = generateAccessToken({
      userId: "user-123",
      email: "test@example.com",
      globalRole: GlobalRole.USER,
      sessionId: "session-123",
    })

    const tamperedToken = validToken.slice(0, -5) + "abcde"
    expect(() => verifyAccessToken(tamperedToken)).toThrow()
  })
})
