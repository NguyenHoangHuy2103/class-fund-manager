import type { Request, Response, NextFunction } from "express"
import * as dashboardService from "./dashboard.service.js"

export async function getDashboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!
    const summary = await dashboardService.getDashboardSummary({
      userId: user.userId,
      role: user.role,
      memberId: user.memberId,
    })

    res.status(200).json({
      ok: true,
      data: summary,
    })
  } catch (error) {
    next(error)
  }
}
