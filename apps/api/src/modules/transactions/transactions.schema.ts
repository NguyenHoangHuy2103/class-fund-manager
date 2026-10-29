import { z } from "zod"

export const createExpenseSchema = z.object({
  category: z.string().min(2, "Vui lòng chọn hoặc nhập hạng mục chi").trim(),
  amount: z
    .number({ invalid_type_error: "Số tiền phải là một con số" })
    .int("Số tiền chi phải là số nguyên (VND)")
    .positive("Số tiền chi phải lớn hơn 0")
    .max(100_000_000, "Số tiền chi tối đa là 100.000.000 ₫"),
  date: z
    .string()
    .datetime({ offset: true, message: "Ngày giao dịch không hợp lệ" })
    .optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày YYYY-MM-DD")),
  description: z.string().min(3, "Nội dung chi ít nhất 3 ký tự").trim(),
  counterparty: z
    .string()
    .min(2, "Vui lòng nhập người/đơn vị nhận tiền")
    .trim(),
  note: z.string().optional(),
})

export const createManualIncomeSchema = z.object({
  category: z.string().min(2, "Vui lòng chọn hoặc nhập hạng mục thu").trim(),
  amount: z
    .number({ invalid_type_error: "Số tiền phải là một con số" })
    .int("Số tiền thu phải là số nguyên (VND)")
    .positive("Số tiền thu phải lớn hơn 0")
    .max(100_000_000, "Số tiền thu tối đa là 100.000.000 ₫"),
  date: z
    .string()
    .datetime({ offset: true, message: "Ngày giao dịch không hợp lệ" })
    .optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày YYYY-MM-DD")),
  description: z.string().min(3, "Nội dung thu ít nhất 3 ký tự").trim(),
  counterparty: z.string().min(2, "Vui lòng nhập người/đơn vị nộp tiền").trim(),
  note: z.string().optional(),
})

export const transactionQuerySchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "ALL"]).default("ALL"),
  category: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
})
