import type { Request, Response, NextFunction } from "express"
import * as dashboardService from "./dashboard.service.js"

export async function getOverview(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const classId = req.user!.classId!
    const overview = await dashboardService.getDashboardOverview(classId, {
      userId: req.user!.userId,
      classRole: req.user!.classRole,
      memberId: req.user!.memberId,
      globalRole: req.user!.globalRole,
    })

    res.status(200).json({
      ok: true,
      data: overview,
    })
  } catch (error) {
    next(error)
  }
}
