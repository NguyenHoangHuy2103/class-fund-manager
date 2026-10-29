import type { Request, Response, NextFunction } from "express"
import { logger } from "../lib/logger.js"
import { env } from "../config/env.js"

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = "AppError"
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    ok: false,
    error: `Không tìm thấy endpoint: ${req.method} ${req.originalUrl}`,
  })
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error("Lỗi server chưa được xử lý", err)

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      ok: false,
      error: err.message,
      details: err.details,
    })
    return
  }

  const isProd = env.NODE_ENV === "production"
  res.status(500).json({
    ok: false,
    error: isProd ? "Đã xảy ra lỗi trên hệ thống máy chủ." : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  })
}
