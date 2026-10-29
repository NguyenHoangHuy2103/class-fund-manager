import type { Request, Response, NextFunction } from "express"
import * as authService from "./auth.service.js"
import {
  setSessionCookies,
  clearSessionCookies,
  generateCsrfToken,
  CSRF_COOKIE_NAME,
  csrfCookieOptions,
  REFRESH_COOKIE_NAME,
} from "../../lib/auth.js"
import { env } from "../../config/env.js"

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password, fullName } = req.body
    const result = await authService.registerUser(email, password, fullName)
    res.status(201).json({
      ok: true,
      message: result.message,
      data: {
        userId: result.userId,
        email: result.email,
        fullName: result.fullName,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = req.body
    const userAgent = req.headers["user-agent"]
    const ip = req.ip || req.socket.remoteAddress

    const result = await authService.loginUser(email, password, userAgent, ip)

    setSessionCookies(res, result.accessToken, result.refreshToken, result.csrfToken)

    res.status(200).json({
      ok: true,
      data: {
        user: result.user,
        activeMembership: result.activeMembership,
        csrfToken: result.csrfToken,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME]
    if (!rawRefreshToken) {
      res.status(401).json({ ok: false, error: "Không tìm thấy refresh token." })
      return
    }

    const result = await authService.refreshUserSession(rawRefreshToken)
    setSessionCookies(
      res,
      result.accessToken,
      result.newRefreshToken,
      result.csrfToken,
    )

    res.status(200).json({
      ok: true,
      data: { user: result.user },
    })
  } catch (error) {
    next(error)
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sessionId = req.user?.sessionId
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME]
    await authService.logoutUser(sessionId, rawRefreshToken)
    clearSessionCookies(res)

    res.status(200).json({
      ok: true,
      message: "Đăng xuất thành công.",
    })
  } catch (error) {
    next(error)
  }
}

export async function verifyEmail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token } = req.body
    const result = await authService.verifyEmail(token)
    res.status(200).json({ ok: true, message: result.message })
  } catch (error) {
    next(error)
  }
}

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = req.body
    const result = await authService.forgotPassword(email)
    res.status(200).json({ ok: true, message: result.message })
  } catch (error) {
    next(error)
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token, newPassword } = req.body
    const result = await authService.resetPassword(token, newPassword)
    clearSessionCookies(res)
    res.status(200).json({ ok: true, message: result.message })
  } catch (error) {
    next(error)
  }
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

export function getCsrfToken(req: Request, res: Response): void {
  const sessionId = req.user?.sessionId || "anon"
  const token = generateCsrfToken(sessionId)
  res.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions)
  res.status(200).json({
    ok: true,
    data: { csrfToken: token },
  })
}

export function getGoogleOAuthUrl(_req: Request, res: Response): void {
  if (!env.GOOGLE_CLIENT_ID) {
    res.status(501).json({
      ok: false,
      error:
        "Google OAuth chưa được cấu hình Client ID. Báo cáo rõ: Chưa kiểm thử trực tiếp OAuth live.",
    })
    return
  }

  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth"
  const options = {
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    client_id: env.GOOGLE_CLIENT_ID,
    access_type: "offline",
    response_type: "code",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
  }

  const qs = new URLSearchParams(options)
  res.status(200).json({
    ok: true,
    data: { url: `${rootUrl}?${qs.toString()}` },
  })
}

export async function handleGoogleCallback(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const code = req.query.code as string
    if (!code) {
      res.status(400).json({ ok: false, error: "Thiếu mã xác thực Google OAuth (code)." })
      return
    }

    const userAgent = req.headers["user-agent"]
    const ip = req.ip || req.socket.remoteAddress

    const result = await authService.handleGoogleOAuthCallback(code, userAgent, ip)
    setSessionCookies(res, result.accessToken, result.refreshToken, result.csrfToken)

    // Redirect về Frontend Origin
    const frontendTarget = env.FRONTEND_ORIGIN.split(",")[0]
    res.redirect(`${frontendTarget}/?login_success=1`)
  } catch (error) {
    next(error)
  }
}
