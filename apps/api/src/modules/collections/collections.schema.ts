import { z } from "zod"

const moneyStringSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "Số tiền phải là số nguyên dương lớn hơn 0")
  .max(12, "Số tiền không được vượt quá giới hạn hệ thống")

const nonNegativeMoneyStringSchema = z
  .string()
  .regex(/^\d+$/, "Số tiền phải là số nguyên không âm (>= 0)")
  .max(12, "Số tiền không được vượt quá giới hạn hệ thống")

export const createCollectionSchema = z.object({
  name: z.string().min(3, "Tên đợt thu phải có ít nhất 3 ký tự").max(100),
  defaultAmount: moneyStringSchema,
  dueDate: z.string().datetime().optional().nullable(),
  description: z.string().max(1000).optional(),
  targetMemberIds: z.array(z.string()).optional(), // Nếu rỗng: Áp dụng toàn bộ lớp
})

export const adjustObligationSchema = z.object({
  targetAmount: nonNegativeMoneyStringSchema,
  discountReason: z.string().min(3, "Vui lòng nhập lý do điều chỉnh hoặc miễn giảm"),
})

export const submitProofSchema = z.object({
  amount: moneyStringSchema,
  fileId: z.string().min(1, "Vui lòng đính kèm ảnh bill chuyển khoản"),
  transferCode: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
  idempotencyKey: z.string().min(8).max(100).optional(),
})

export const rejectProofSchema = z.object({
  rejectReason: z.string().min(3, "Vui lòng nhập lý do từ chối bằng chứng chuyển khoản"),
})

export const batchApproveSchema = z.object({
  proofIds: z.array(z.string().min(1)).min(1, "Danh sách duyệt không được để trống"),
})

export const recordCashPaymentSchema = z.object({
  classMemberId: z.string().min(1, "Vui lòng chọn thành viên đóng tiền"),
  amount: moneyStringSchema,
  note: z.string().max(500).optional(),
  idempotencyKey: z.string().min(8).max(100).optional(),
})

export const recordCashBatchSchema = z.object({
  items: z
    .array(
      z.object({
        classMemberId: z.string().min(1),
        amount: moneyStringSchema,
        note: z.string().max(500).optional(),
      }),
    )
    .min(1, "Danh sách thu tiền mặt không được để trống"),
  idempotencyKey: z.string().min(8).max(100).optional(),
})

export const getQrQuerySchema = z.object({
  memberId: z.string().optional(),
  customAmount: moneyStringSchema.optional(),
})
