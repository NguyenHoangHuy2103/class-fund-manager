import type { Request, Response, NextFunction } from "express"
import {
  verifyAccessToken,
  ACCESS_COOKIE_NAME,
  type JwtPayload,
} from "../lib/auth.js"
import type { GlobalRole, ClassRole } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { env } from "../config/env.js"

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token =
      req.cookies?.[ACCESS_COOKIE_NAME] ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.substring(7)
        : undefined)

    if (token) {
      const decoded = verifyAccessToken(token)

      // Kiểm tra thu hồi phiên (Session Revocation):
      // Nếu có sessionId, xác minh phiên có hiệu lực trong database và chưa bị thu hồi
      if (decoded.sessionId) {
        if (env.NODE_ENV === "test" && decoded.sessionId.startsWith("mock-")) {
          req.user = decoded
          return next()
        }

        const session = await prisma.userSession.findUnique({
          where: { id: decoded.sessionId },
          select: { isRevoked: true, expiresAt: true },
        })

        if (!session || session.isRevoked || session.expiresAt < new Date()) {
          req.user = undefined
          return next()
        }
      }

      req.user = decoded
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

export function requireGlobalRole(...allowedRoles: GlobalRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        ok: false,
        error: "Vui lòng đăng nhập để thực hiện thao tác này.",
      })
      return
    }

    if (!allowedRoles.includes(req.user.globalRole)) {
      res.status(403).json({
        ok: false,
        error: "Bạn không có quyền thực hiện thao tác quản trị này.",
      })
      return
    }

    next()
  }
}

export function requireClassRole(...allowedRoles: ClassRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        ok: false,
        error: "Vui lòng đăng nhập để thực hiện thao tác này.",
      })
      return
    }

    // Super Admin có thể xem được dữ liệu mọi lớp
    if (req.user.globalRole === "SUPER_ADMIN") {
      return next()
    }

    if (!req.user.classRole || !allowedRoles.includes(req.user.classRole)) {
      res.status(403).json({
        ok: false,
        error: "Bạn không có quyền thực hiện thao tác này trong lớp học.",
      })
      return
    }

    next()
  }
}
