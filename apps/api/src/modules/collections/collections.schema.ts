import { z } from "zod"

export const createCollectionSchema = z.object({
  name: z.string().min(3, "Tên đợt thu ít nhất 3 ký tự").trim(),
  description: z.string().optional(),
  amount: z
    .number({ invalid_type_error: "Số tiền phải là một con số" })
    .int("Số tiền phải là số nguyên (VND)")
    .positive("Số tiền phải lớn hơn 0")
    .max(50_000_000, "Số tiền tối đa là 50.000.000 ₫"),
  dueDate: z
    .string()
    .datetime({
      offset: true,
      message: "Hạn đóng phải là định dạng ngày giờ hợp lệ",
    })
    .optional()
    .or(
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày YYYY-MM-DD")
        .optional(),
    ),
})

export const updateCollectionStatusSchema = z.object({
  status: z.enum(["OPEN", "CLOSED"], {
    errorMap: () => ({
      message: "Trạng thái đợt thu phải là OPEN hoặc CLOSED",
    }),
  }),
})

export const confirmPaymentSchema = z.object({
  memberId: z.string().min(1, "Vui lòng chọn thành viên đóng tiền"),
  note: z.string().optional(),
})

export const collectionQuerySchema = z.object({
  status: z.enum(["OPEN", "CLOSED", "ALL"]).default("ALL"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
})
