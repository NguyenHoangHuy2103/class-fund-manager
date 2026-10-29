import { describe, it, expect } from "vitest"
import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
} from "../src/lib/auth.js"
import { Role } from "@prisma/client"

describe("Cơ chế xác thực & Bảo mật (Auth & Security)", () => {
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

  it("Tạo và giải mã JWT token chứa đúng payload vai trò (Role)", () => {
    const payload = {
      userId: "user-123",
      email: "admin@lopse1902.edu.vn",
      role: Role.ADMIN,
      memberId: "member-123",
    }

    const token = generateToken(payload)
    expect(typeof token).toBe("string")

    const decoded = verifyToken(token)
    expect(decoded.userId).toBe(payload.userId)
    expect(decoded.email).toBe(payload.email)
    expect(decoded.role).toBe(Role.ADMIN)
    expect(decoded.memberId).toBe(payload.memberId)
  })

  it("Từ chối token bị sửa đổi hoặc sai secret", () => {
    const validToken = generateToken({
      userId: "user-123",
      email: "test@example.com",
      role: Role.MEMBER,
    })

    const tamperedToken = validToken.slice(0, -5) + "abcde"
    expect(() => verifyToken(tamperedToken)).toThrow()
  })
})
