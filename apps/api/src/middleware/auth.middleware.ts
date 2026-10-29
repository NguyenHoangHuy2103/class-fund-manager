import type { Request, Response, NextFunction } from "express"
import { verifyToken, TOKEN_COOKIE_NAME, type JwtPayload } from "../lib/auth.js"
import type { Role } from "@prisma/client"

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    const token =
      req.cookies?.[TOKEN_COOKIE_NAME] ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.substring(7)
        : undefined)

    if (token) {
      req.user = verifyToken(token)
    }
  } catch {
    req.user = undefined
  }
  next()
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({
      ok: false,
      error: "Vui lòng đăng nhập để thực hiện thao tác này.",
    })
    return
  }
  next()
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        ok: false,
        error: "Vui lòng đăng nhập để thực hiện thao tác này.",
      })
      return
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        ok: false,
        error: "Bạn không có quyền thực hiện thao tác này.",
      })
      return
    }

    next()
  }
}
