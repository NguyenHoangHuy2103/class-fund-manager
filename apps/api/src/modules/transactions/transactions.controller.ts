import type { Request, Response, NextFunction } from "express"
import * as transactionsService from "./transactions.service.js"
import type { FundType, TransactionType } from "@prisma/client"

export async function listTransactions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const classId = req.user!.classId!
    const { periodId, fundType, type, page, limit } = req.query

    const result = await transactionsService.listTransactions({
      classId,
      periodId: periodId as string | undefined,
      fundType: fundType as FundType | undefined,
      type: type as TransactionType | undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    })

    res.status(200).json({
      ok: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}
