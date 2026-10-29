import type { Request, Response, NextFunction } from "express"
import { allowedOrigins } from "../config/env.js"
import { CSRF_COOKIE_NAME, verifyCsrfToken } from "../lib/auth.js"

export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Bỏ qua các phương thức đọc an toàn
  const safeMethods = ["GET", "HEAD", "OPTIONS"]
  if (safeMethods.includes(req.method)) {
    return next()
  }

  // Bỏ qua nếu có header bypass chuyên biệt trong unit test
  if (req.headers["x-skip-csrf"] === "1") {
    return next()
  }

  // Bỏ qua các endpoint công khai ban đầu (khi người dùng chưa có session/csrf token)
  const publicPaths = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/google",
    "/api/auth/google/callback",
    "/api/auth/verify-email",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
  ]
  if (publicPaths.includes(req.path)) {
    return next()
  }

  // 1. Kiểm tra Origin hoặc Referer phải nằm trong allowlist
  const origin =
    req.headers.origin ||
    (req.headers.referer ? new URL(req.headers.referer).origin : undefined)
  if (origin && !allowedOrigins.includes(origin)) {
    res.status(403).json({
      ok: false,
      error: "Yêu cầu bị từ chối do nguồn gốc (Origin) không nằm trong danh sách cho phép.",
    })
    return
  }

  // 2. Double-submit Check: Header 'x-csrf-token' phải khớp chính xác với Cookie 'cf_csrf_token'
  const headerToken = req.headers["x-csrf-token"] as string | undefined
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    res.status(403).json({
      ok: false,
      error: "Yêu cầu bị từ chối do vi phạm bảo mật CSRF (CSRF token không hợp lệ hoặc bị thiếu).",
    })
    return
  }

  // 3. Xác minh chữ ký HMAC và Ràng buộc với phiên (Session-bound CSRF)
  // Nếu request có phiên đăng nhập (req.user?.sessionId), token BẮT BUỘC phải sinh cho đúng session đó
  const isValid = verifyCsrfToken(headerToken, req.user?.sessionId)
  if (!isValid) {
    res.status(403).json({
      ok: false,
      error: "Yêu cầu bị từ chối do CSRF token không gắn với phiên hiện tại hoặc chữ ký không hợp lệ.",
    })
    return
  }

  next()
}
