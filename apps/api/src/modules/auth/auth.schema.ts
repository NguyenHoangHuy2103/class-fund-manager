import { z } from "zod"

export const registerSchema = z.object({
  email: z.string().email("Địa chỉ email không hợp lệ"),
  password: z
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .max(100, "Mật khẩu không được quá 100 ký tự"),
  fullName: z
    .string()
    .min(2, "Họ và tên phải có ít nhất 2 ký tự")
    .max(100, "Họ và tên không được quá 100 ký tự"),
})

export const loginSchema = z.object({
  email: z.string().email("Địa chỉ email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
})

export const verifyEmailSchema = z.object({
  token: z.string().min(10, "Mã xác thực không hợp lệ"),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email("Địa chỉ email không hợp lệ"),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Mã đổi mật khẩu không hợp lệ"),
  newPassword: z.string().min(6, "Mật khẩu mới phải có ít nhất 6 ký tự"),
})
