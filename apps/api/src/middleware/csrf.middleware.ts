import type { Request, Response, NextFunction } from "express"
import { allowedOrigins, env } from "../config/env.js"

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

  // Bỏ qua trong môi trường test nếu không yêu cầu
  if (env.NODE_ENV === "test") {
    return next()
  }

  // 1. Kiểm tra custom header (Trình duyệt chặn form submit chéo site gửi custom headers)
  const customHeader =
    req.headers["x-requested-with"] || req.headers["x-csrf-protection"]
  if (customHeader) {
    return next()
  }

  // 2. Kiểm tra Origin hoặc Referer
  const origin =
    req.headers.origin ||
    (req.headers.referer ? new URL(req.headers.referer).origin : undefined)
  if (origin && allowedOrigins.includes(origin)) {
    return next()
  }

  res.status(403).json({
    ok: false,
    error:
      "Yêu cầu bị từ chối do vi phạm chính sách bảo mật CSRF (thiếu header X-Requested-With hoặc Origin không hợp lệ).",
  })
}
