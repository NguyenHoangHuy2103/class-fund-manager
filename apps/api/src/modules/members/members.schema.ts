import { z } from "zod"

export const createMemberSchema = z.object({
  code: z
    .string()
    .min(2, "Mã thành viên ít nhất 2 ký tự")
    .max(20, "Mã thành viên tối đa 20 ký tự")
    .trim()
    .toUpperCase(),
  name: z.string().min(2, "Họ tên ít nhất 2 ký tự").trim(),
  email: z.string().email("Email không hợp lệ").trim().toLowerCase(),
  phone: z
    .string()
    .regex(/^0\d{9}$/, "Số điện thoại gồm 10 chữ số bắt đầu bằng 0")
    .optional()
    .or(z.literal("")),
})

export const updateMemberSchema = z.object({
  name: z.string().min(2, "Họ tên ít nhất 2 ký tự").trim().optional(),
  phone: z
    .string()
    .regex(/^0\d{9}$/, "Số điện thoại gồm 10 chữ số bắt đầu bằng 0")
    .optional()
    .or(z.literal("")),
})

export const setMemberStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"], {
    errorMap: () => ({ message: "Trạng thái phải là ACTIVE hoặc INACTIVE" }),
  }),
})

export const memberQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ALL"]).default("ACTIVE"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
})
