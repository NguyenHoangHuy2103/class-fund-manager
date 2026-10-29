import { prisma } from "../../lib/prisma.js"
import {
  comparePassword,
  generateToken,
  type JwtPayload,
} from "../../lib/auth.js"
import { AppError } from "../../middleware/error.middleware.js"

export async function loginUser(email: string, plainPassword: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      member: true,
    },
  })

  if (!user) {
    throw new AppError(401, "Email hoặc mật khẩu không chính xác.")
  }

  const isMatch = await comparePassword(plainPassword, user.passwordHash)
  if (!isMatch) {
    throw new AppError(401, "Email hoặc mật khẩu không chính xác.")
  }

  // Nếu là member nhưng trạng thái INACTIVE thì không cho đăng nhập
  if (user.member && user.member.status === "INACTIVE") {
    throw new AppError(403, "Tài khoản thành viên này đã bị ngừng hoạt động.")
  }

  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    memberId: user.member?.id,
  }

  const token = generateToken(payload)

  const { passwordHash: _, ...safeUser } = user

  return {
    user: safeUser,
    token,
  }
}

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      member: true,
    },
  })

  if (!user) {
    throw new AppError(404, "Không tìm thấy thông tin tài khoản.")
  }

  const { passwordHash: _, ...safeUser } = user
  return safeUser
}
