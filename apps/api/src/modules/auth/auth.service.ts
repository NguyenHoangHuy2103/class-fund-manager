import { prisma } from "../../lib/prisma.js"
import {
  comparePassword,
  hashPassword,
  hashToken,
  generateRandomToken,
  generateCsrfToken,
  generateAccessToken,
  type JwtPayload,
} from "../../lib/auth.js"
import { AppError } from "../../middleware/error.middleware.js"
import { env } from "../../config/env.js"
import { logger } from "../../lib/logger.js"

export async function registerUser(email: string, plainPassword: string, fullName: string) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw new AppError(400, "Địa chỉ email này đã được sử dụng.")
  }

  const passwordHash = await hashPassword(plainPassword)
  const rawVerifyToken = generateRandomToken()
  const verifyTokenHash = hashToken(rawVerifyToken)

  const user = await prisma.user.create({
    data: {
      email,
      fullName,
      passwordHash,
      isEmailVerified: false,
      emailVerifyTokenHash: verifyTokenHash,
      emailVerifyExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 giờ
    },
  })

  // Lưu vào Email Outbox chống gửi trùng
  const outbox = await prisma.emailOutbox.create({
    data: {
      idempotencyKey: `VERIFY_EMAIL_${user.id}_${Date.now()}`,
      toEmail: email,
      subject: "Xác thực tài khoản - Quản lý Quỹ Lớp",
      htmlContent: `<p>Xin chào ${fullName},</p><p>Mã xác thực tài khoản của bạn: <b>${rawVerifyToken}</b> (có hiệu lực 24 giờ).</p>`,
    },
  })

  // Chỉ ghi log loại sự kiện và ID outbox, tuyệt đối không in token hoặc nội dung email
  logger.info("Email queued to outbox", {
    eventType: "VERIFY_EMAIL",
    emailId: outbox.id,
  })

  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    message: "Đăng ký thành công. Vui lòng xác thực email.",
  }
}

export async function loginUser(
  email: string,
  plainPassword: string,
  userAgent?: string,
  ipAddress?: string,
) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: { class: true },
      },
    },
  })

  if (!user || !user.passwordHash) {
    throw new AppError(401, "Email hoặc mật khẩu không chính xác.")
  }

  if (user.isLocked) {
    throw new AppError(403, "Tài khoản của bạn đã bị khóa bởi Quản trị viên.")
  }

  const isMatch = await comparePassword(plainPassword, user.passwordHash)
  if (!isMatch) {
    throw new AppError(401, "Email hoặc mật khẩu không chính xác.")
  }

  const activeMembership = user.memberships[0] // Lớp sinh hoạt chính hiện tại

  // Tạo Session mới
  const rawRefreshToken = generateRandomToken()
  const refreshTokenHash = hashToken(rawRefreshToken)

  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      refreshTokenHash,
      userAgent,
      ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
    },
  })

  // Sinh CSRF token có chữ ký HMAC và gắn chặt với sessionId này
  const csrfToken = generateCsrfToken(session.id)

  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    globalRole: user.globalRole,
    classId: activeMembership?.classId,
    classRole: activeMembership?.role,
    memberId: activeMembership?.id,
    sessionId: session.id,
  }

  const accessToken = generateAccessToken(payload)

  const { passwordHash: _, emailVerifyTokenHash: _v, passwordResetTokenHash: _r, ...safeUser } = user

  return {
    user: safeUser,
    activeMembership,
    accessToken,
    refreshToken: rawRefreshToken,
    csrfToken,
  }
}

export async function refreshUserSession(rawRefreshToken: string) {
  const tokenHash = hashToken(rawRefreshToken)

  const session = await prisma.userSession.findUnique({
    where: { refreshTokenHash: tokenHash },
    include: {
      user: {
        include: {
          memberships: {
            where: { status: "ACTIVE" },
            include: { class: true },
          },
        },
      },
    },
  })

  if (!session || session.isRevoked || session.expiresAt < new Date()) {
    throw new AppError(401, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.")
  }

  if (session.user.isLocked) {
    throw new AppError(403, "Tài khoản đã bị khóa.")
  }

  // Xoay refresh token (Token rotation)
  const newRawRefreshToken = generateRandomToken()
  const newRefreshTokenHash = hashToken(newRawRefreshToken)

  await prisma.userSession.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: newRefreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  const activeMembership = session.user.memberships[0]

  const payload: JwtPayload = {
    userId: session.user.id,
    email: session.user.email,
    globalRole: session.user.globalRole,
    classId: activeMembership?.classId,
    classRole: activeMembership?.role,
    memberId: activeMembership?.id,
    sessionId: session.id,
  }

  const accessToken = generateAccessToken(payload)
  const csrfToken = generateCsrfToken(session.id)

  return {
    accessToken,
    newRefreshToken: newRawRefreshToken,
    csrfToken,
    user: session.user,
  }
}

export async function logoutUser(sessionId?: string, rawRefreshToken?: string) {
  if (sessionId) {
    await prisma.userSession.updateMany({
      where: { id: sessionId },
      data: { isRevoked: true },
    })
  }
  if (rawRefreshToken) {
    const tokenHash = hashToken(rawRefreshToken)
    await prisma.userSession.updateMany({
      where: { refreshTokenHash: tokenHash },
      data: { isRevoked: true },
    })
  }
}

export async function verifyEmail(rawToken: string) {
  const tokenHash = hashToken(rawToken)

  const user = await prisma.user.findFirst({
    where: {
      emailVerifyTokenHash: tokenHash,
      emailVerifyExpiresAt: { gt: new Date() },
    },
  })

  if (!user) {
    throw new AppError(400, "Mã xác thực không đúng hoặc đã hết hạn.")
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      emailVerifyTokenHash: null,
      emailVerifyExpiresAt: null,
    },
  })

  return { message: "Xác thực email thành công." }
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    // Không làm lộ việc email có tồn tại hay không
    return { message: "Nếu email tồn tại, hướng dẫn đổi mật khẩu đã được gửi đi." }
  }

  const rawResetToken = generateRandomToken()
  const resetTokenHash = hashToken(rawResetToken)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: resetTokenHash,
      passwordResetExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 phút
    },
  })

  const outbox = await prisma.emailOutbox.create({
    data: {
      idempotencyKey: `RESET_PASSWORD_${user.id}_${Date.now()}`,
      toEmail: email,
      subject: "Đặt lại mật khẩu - Quản lý Quỹ Lớp",
      htmlContent: `<p>Mã đặt lại mật khẩu của bạn là: <b>${rawResetToken}</b> (hết hạn trong 15 phút).</p>`,
    },
  })

  // Chỉ ghi log loại sự kiện và ID outbox, tuyệt đối không in token hoặc nội dung email
  logger.info("Email queued to outbox", {
    eventType: "RESET_PASSWORD",
    emailId: outbox.id,
  })

  return { message: "Nếu email tồn tại, hướng dẫn đổi mật khẩu đã được gửi đi." }
}

export async function resetPassword(rawToken: string, newPlainPassword: string) {
  const tokenHash = hashToken(rawToken)

  const user = await prisma.user.findFirst({
    where: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { gt: new Date() },
    },
  })

  if (!user) {
    throw new AppError(400, "Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.")
  }

  const newPasswordHash = await hashPassword(newPlainPassword)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPasswordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    },
  })

  // Thu hồi (revoke) toàn bộ phiên đăng nhập cũ để bảo đảm an toàn
  await prisma.userSession.updateMany({
    where: { userId: user.id },
    data: { isRevoked: true },
  })

  return { message: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." }
}

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          class: true,
        },
      },
      createdClass: true,
    },
  })

  if (!user) {
    throw new AppError(404, "Không tìm thấy thông tin tài khoản.")
  }

  const { passwordHash: _, emailVerifyTokenHash: _v, passwordResetTokenHash: _r, ...safeUser } = user
  return safeUser
}

export async function handleGoogleOAuthCallback(
  code: string,
  userAgent?: string,
  ipAddress?: string,
) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new AppError(
      501,
      "Google OAuth chưa được cấu hình Client ID / Secret trên máy chủ. Chưa kiểm thử trực tiếp OAuth live.",
    )
  }

  // Luồng trao đổi mã thực tế với máy chủ Google OAuth
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_CALLBACK_URL,
      grant_type: "authorization_code",
    }),
  })

  if (!tokenResponse.ok) {
    throw new AppError(400, "Xác thực với máy chủ Google thất bại.")
  }

  const tokenData = (await tokenResponse.json()) as any
  const accessToken = tokenData.access_token

  // Lấy thông tin profile từ Google
  const userResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!userResponse.ok) {
    throw new AppError(400, "Không thể lấy thông tin người dùng từ Google.")
  }

  const googleUser = (await userResponse.json()) as any
  const { sub: googleId, email, name, picture } = googleUser

  // Tìm hoặc tạo User
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: { class: true },
      },
    },
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        fullName: name || "Thành viên Google",
        googleId,
        avatarUrl: picture,
        isEmailVerified: true,
      },
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: { class: true },
        },
      },
    })
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId, isEmailVerified: true },
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: { class: true },
        },
      },
    })
  }

  const rawRefreshToken = generateRandomToken()
  const refreshTokenHash = hashToken(rawRefreshToken)

  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      refreshTokenHash,
      userAgent,
      ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  const csrfToken = generateCsrfToken(session.id)

  const activeMembership = user.memberships[0]
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    globalRole: user.globalRole,
    classId: activeMembership?.classId,
    classRole: activeMembership?.role,
    memberId: activeMembership?.id,
    sessionId: session.id,
  }

  const appAccessToken = generateAccessToken(payload)

  return {
    user,
    accessToken: appAccessToken,
    refreshToken: rawRefreshToken,
    csrfToken,
  }
}
