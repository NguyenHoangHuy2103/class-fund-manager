import type { Request, Response, NextFunction } from "express"
import * as membersService from "./members.service.js"

export async function getMembers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as any
    const result = await membersService.listMembers(query)
    res.status(200).json({ ok: true, data: result })
  } catch (error) {
    next(error)
  }
}

export async function getMember(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const member = await membersService.getMemberById(req.params.id)
    res.status(200).json({ ok: true, data: { member } })
  } catch (error) {
    next(error)
  }
}

export async function createMember(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const member = await membersService.createMember(req.body)
    res.status(201).json({
      ok: true,
      message: "Thêm thành viên mới thành công.",
      data: { member },
    })
  } catch (error) {
    next(error)
  }
}

export async function updateMember(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const member = await membersService.updateMember(req.params.id, req.body)
    res.status(200).json({
      ok: true,
      message: "Cập nhật thông tin thành viên thành công.",
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
    const { status } = req.body
    const member = await membersService.setMemberStatus(req.params.id, status)
    res.status(200).json({
      ok: true,
      message:
        status === "ACTIVE"
          ? "Đã kích hoạt lại thành viên."
          : "Đã chuyển thành viên sang ngừng hoạt động.",
      data: { member },
    })
  } catch (error) {
    next(error)
  }
}
