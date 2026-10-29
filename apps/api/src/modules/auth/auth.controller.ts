import type { Request, Response, NextFunction } from "express"
import * as authService from "./auth.service.js"
import { setAuthCookie, clearAuthCookie } from "../../lib/auth.js"

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = req.body
    const result = await authService.loginUser(email, password)

    setAuthCookie(res, result.token)

    res.status(200).json({
      ok: true,
      data: {
        user: result.user,
      },
    })
  } catch (error) {
    next(error)
  }
}

export function logout(_req: Request, res: Response): void {
  clearAuthCookie(res)
  res.status(200).json({
    ok: true,
    message: "Đăng xuất thành công.",
  })
}

export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await authService.getUserProfile(req.user!.userId)
    res.status(200).json({
      ok: true,
      data: { user },
    })
  } catch (error) {
    next(error)
  }
}
