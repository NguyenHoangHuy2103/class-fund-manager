import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Email không đúng định dạng").trim().toLowerCase(),
  password: z.string().min(1, "Mật khẩu không được để trống"),
})
