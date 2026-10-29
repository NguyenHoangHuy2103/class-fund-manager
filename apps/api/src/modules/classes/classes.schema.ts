import { z } from "zod"

export const createClassSchema = z.object({
  code: z
    .string()
    .min(3, "Mã lớp phải có ít nhất 3 ký tự")
    .max(20, "Mã lớp không được quá 20 ký tự")
    .regex(/^[a-zA-Z0-9_-]+$/, "Mã lớp chỉ chứa chữ, số, dấu gạch nối và gạch dưới"),
  name: z.string().min(3, "Tên lớp phải có ít nhất 3 ký tự").max(100),
  memberCode: z.string().min(2, "Mã định danh/MSSV của thủ quỹ là bắt buộc"),
  displayName: z.string().min(2, "Họ tên hiển thị là bắt buộc"),
  deviceHash: z.string().optional(),
})

export const joinClassSchema = z.object({
  inviteCode: z.string().min(4, "Mã mời lớp không hợp lệ"),
  memberCode: z.string().min(2, "Vui lòng nhập MSSV hoặc mã số thành viên"),
  displayName: z.string().min(2, "Vui lòng nhập họ tên của bạn"),
})

export const updateInviteCodeSchema = z.object({
  isInviteActive: z.boolean().optional(),
  regenerate: z.boolean().optional(),
})

export const updateBankConfigSchema = z.object({
  bankBin: z.string().min(3, "Mã BIN ngân hàng không hợp lệ"),
  bankName: z.string().min(2, "Tên ngân hàng là bắt buộc"),
  bankAccountNo: z.string().min(4, "Số tài khoản ngân hàng là bắt buộc"),
  bankAccountHolder: z.string().min(2, "Tên chủ tài khoản là bắt buộc"),
})
