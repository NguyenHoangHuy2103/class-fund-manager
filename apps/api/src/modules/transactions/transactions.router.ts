import { Router } from "express"
import * as transactionsController from "./transactions.controller.js"
import {
  requireAuth,
  requireClassRole,
} from "../../middleware/auth.middleware.js"

export const transactionsRouter = Router()

transactionsRouter.get(
  "/",
  requireAuth,
  requireClassRole("TREASURER", "MEMBER"),
  transactionsController.listTransactions,
)
