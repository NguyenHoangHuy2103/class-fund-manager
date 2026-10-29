import { Router } from "express"
import * as transactionsController from "./transactions.controller.js"
import {
  createExpenseSchema,
  createManualIncomeSchema,
  transactionQuerySchema,
} from "./transactions.schema.js"
import { validate } from "../../middleware/validate.middleware.js"
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js"

export const transactionsRouter = Router()

// Tất cả thành viên đã đăng nhập xem được sổ thu–chi (Minh bạch quỹ lớp)
transactionsRouter.get(
  "/",
  requireAuth,
  validate({ query: transactionQuerySchema }),
  transactionsController.getTransactions,
)

transactionsRouter.get(
  "/balance",
  requireAuth,
  transactionsController.getBalance,
)
transactionsRouter.get(
  "/:id",
  requireAuth,
  transactionsController.getTransaction,
)

// Chỉ ADMIN mới được ghi nhận khoản chi hoặc khoản thu ngoài
transactionsRouter.post(
  "/expenses",
  requireRole("ADMIN"),
  validate({ body: createExpenseSchema }),
  transactionsController.createExpense,
)

transactionsRouter.post(
  "/incomes",
  requireRole("ADMIN"),
  validate({ body: createManualIncomeSchema }),
  transactionsController.createIncome,
)
