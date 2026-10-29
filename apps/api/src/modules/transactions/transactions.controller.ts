import type { Request, Response, NextFunction } from "express"
import * as transactionsService from "./transactions.service.js"

export async function getTransactions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as any
    const result = await transactionsService.listTransactions(query)
    res.status(200).json({ ok: true, data: result })
  } catch (error) {
    next(error)
  }
}

export async function getTransaction(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const transaction = await transactionsService.getTransactionById(
      req.params.id,
    )
    res.status(200).json({ ok: true, data: { transaction } })
  } catch (error) {
    next(error)
  }
}

export async function createExpense(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!
    const transaction = await transactionsService.createExpense(
      req.body,
      user.userId,
    )
    res.status(201).json({
      ok: true,
      message: `Đã ghi nhận khoản chi ${new Intl.NumberFormat("vi-VN").format(transaction.amount)} ₫ (${transaction.code}).`,
      data: { transaction },
    })
  } catch (error) {
    next(error)
  }
}

export async function createIncome(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!
    const transaction = await transactionsService.createManualIncome(
      req.body,
      user.userId,
    )
    res.status(201).json({
      ok: true,
      message: `Đã ghi nhận khoản thu ngoài ${new Intl.NumberFormat("vi-VN").format(transaction.amount)} ₫ (${transaction.code}).`,
      data: { transaction },
    })
  } catch (error) {
    next(error)
  }
}

export async function getBalance(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const summary = await transactionsService.getFundBalance()
    res.status(200).json({ ok: true, data: summary })
  } catch (error) {
    next(error)
  }
}
