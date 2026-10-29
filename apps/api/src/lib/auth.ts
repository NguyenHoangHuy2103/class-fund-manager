import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import type { Response, CookieOptions } from "express"
import { env } from "../config/env.js"
import type { GlobalRole, ClassRole } from "@prisma/client"

export const ACCESS_COOKIE_NAME = "cf_access_token"
export const REFRESH_COOKIE_NAME = "cf_refresh_token"
export const CSRF_COOKIE_NAME = "cf_csrf_token"

export interface JwtPayload {
  userId: string
  email: string
  globalRole: GlobalRole
  classId?: string
  classRole?: ClassRole
  memberId?: string
  sessionId: string
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(plain, salt)
}

export async function comparePassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex")
}

export function generateRandomToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

export function generateCsrfToken(sessionId: string): string {
  const random = crypto.randomBytes(24).toString("hex")
  const data = `${sessionId}:${random}`
  const signature = crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(data)
    .digest("hex")
  return `${sessionId}.${random}.${signature}`
}

export function verifyCsrfToken(
  csrfToken: string,
  expectedSessionId?: string,
): boolean {
  if (!csrfToken || typeof csrfToken !== "string") return false
  const parts = csrfToken.split(".")
  if (parts.length !== 3) return false
  const [tokenSessionId, random, sig] = parts

  // 1. Nếu request đã được xác thực (có expectedSessionId), CSRF token BẮT BUỘC phải sinh cho đúng session đó
  if (expectedSessionId && tokenSessionId !== expectedSessionId) {
    return false
  }

  // 2. Kiểm tra chữ ký HMAC
  const data = `${tokenSessionId}:${random}`
  const expectedSig = crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(data)
    .digest("hex")

  try {
    return crypto.timingSafeEqual(
      Buffer.from(sig, "hex"),
      Buffer.from(expectedSig, "hex"),
    )
  } catch {
    return false
  }
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "15m", // Phiên ngắn 15 phút, tự làm mới qua refresh token
  })
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload
}

export const accessCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 15 * 60 * 1000, // 15 phút
  path: "/",
}

export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
  path: "/api/auth",
}

export const csrfCookieOptions: CookieOptions = {
  httpOnly: false, // Client đọc được để gửi trong header x-csrf-token
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
}

export function setSessionCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  csrfToken?: string,
): void {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, accessCookieOptions)
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions)
  if (csrfToken) {
    res.cookie(CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions)
  }
}

export function clearSessionCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE_NAME, { ...accessCookieOptions, maxAge: 0 })
  res.clearCookie(REFRESH_COOKIE_NAME, { ...refreshCookieOptions, maxAge: 0 })
  res.clearCookie(CSRF_COOKIE_NAME, { ...csrfCookieOptions, maxAge: 0 })
}
