import type { Request, Response, NextFunction } from "express"

interface RateLimitRecord {
  count: number
  resetTime: number
}

const loginAttempts = new Map<string, RateLimitRecord>()

// Xóa bản ghi hết hạn định kỳ mỗi 5 phút
setInterval(
  () => {
    const now = Date.now()
    for (const [ip, record] of loginAttempts.entries()) {
      if (now > record.resetTime) {
        loginAttempts.delete(ip)
      }
    }
  },
  5 * 60 * 1000,
).unref()

export function loginRateLimiter(maxAttempts = 10, windowMs = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Không áp dụng trong môi trường test
    if (process.env.NODE_ENV === "test") {
      return next()
    }

    const ip = req.ip || req.socket.remoteAddress || "unknown"
    const now = Date.now()

    let record = loginAttempts.get(ip)
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs }
      loginAttempts.set(ip, record)
    }

    record.count++

    if (record.count > maxAttempts) {
      const waitMinutes = Math.ceil((record.resetTime - now) / 60000)
      res.status(429).json({
        ok: false,
        error: `Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau ${waitMinutes} phút.`,
      })
      return
    }

    next()
  }
}
