import type { Request, Response, NextFunction } from "express"
import * as membersService from "./members.service.js"

export async function listMembers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const classId = req.user!.classId!
    const { search, status, page, limit } = req.query as any

    const result = await membersService.listMembers({
      classId,
      search,
      status,
      page: Number(page) || 1,
      limit: Number(limit) || 50,
    })

    res.status(200).json({ ok: true, data: result })
  } catch (error) {
    next(error)
  }
}

export async function approveMember(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const classId = req.user!.classId!
    const memberId = req.params.id as string
    const actorId = req.user!.userId

    const member = await membersService.approveMember(classId, memberId, actorId)
    res.status(200).json({
      ok: true,
      message: "Đã phê duyệt thành viên vào lớp.",
      data: { member },
    })
  } catch (error) {
    next(error)
  }
}

export async function rejectMember(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const classId = req.user!.classId!
    const memberId = req.params.id as string
    const actorId = req.user!.userId

    const member = await membersService.rejectMember(classId, memberId, actorId)
    res.status(200).json({
      ok: true,
      message: "Đã từ chối yêu cầu tham gia lớp.",
      data: { member },
    })
  } catch (error) {
    next(error)
  }
}

export async function setMemberStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const classId = req.user!.classId!
    const memberId = req.params.id as string
    const { status } = req.body
    const actorId = req.user!.userId

    const member = await membersService.setMemberStatus(
      classId,
      memberId,
      status,
      actorId,
    )

    res.status(200).json({
      ok: true,
      message: `Đã cập nhật trạng thái thành viên sang ${status}.`,
      data: { member },
    })
  } catch (error) {
    next(error)
  }
}
