import type { Request, Response, NextFunction } from "express"
import * as classesService from "./classes.service.js"

export async function createClass(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { code, name, memberCode, displayName, deviceHash } = req.body
    const ip = req.ip || req.socket.remoteAddress
    const userId = req.user!.userId

    const result = await classesService.createClass(
      userId,
      code,
      name,
      memberCode,
      displayName,
      ip,
      deviceHash,
    )

    res.status(201).json({
      ok: true,
      message: "Khởi tạo lớp học và kỳ 1 thành công.",
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function joinClass(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { inviteCode, memberCode, displayName } = req.body
    const userId = req.user!.userId

    const result = await classesService.joinClassByInviteCode(
      userId,
      inviteCode,
      memberCode,
      displayName,
    )

    res.status(201).json({
      ok: true,
      message: result.message,
      data: { member: result.member },
    })
  } catch (error) {
    next(error)
  }
}

export async function reapply(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { classId } = req.body
    const userId = req.user!.userId

    const result = await classesService.reapplyJoin(userId, classId)
    res.status(200).json({ ok: true, message: result.message, data: result.member })
  } catch (error) {
    next(error)
  }
}

export async function cancelJoin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { classId } = req.body
    const userId = req.user!.userId

    const result = await classesService.cancelJoinRequest(userId, classId)
    res.status(200).json({ ok: true, message: result.message })
  } catch (error) {
    next(error)
  }
}

export async function getCurrentClass(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const classId = req.user?.classId
    if (!classId) {
      res.status(404).json({ ok: false, error: "Bạn chưa tham gia lớp học nào." })
      return
    }

    const c = await classesService.getCurrentClass(classId)
    res.status(200).json({ ok: true, data: { class: c } })
  } catch (error) {
    next(error)
  }
}

export async function updateInviteCode(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const classId = req.user!.classId!
    const { isInviteActive, regenerate } = req.body

    const updated = await classesService.updateInviteCode(
      classId,
      isInviteActive,
      regenerate,
    )

    res.status(200).json({
      ok: true,
      message: "Cập nhật mã mời lớp thành công.",
      data: {
        inviteCode: updated.inviteCode,
        isInviteActive: updated.isInviteActive,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function updateBankConfig(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const classId = req.user!.classId!
    const { bankBin, bankName, bankAccountNo, bankAccountHolder } = req.body
    const actorId = req.user!.userId

    const updated = await classesService.updateBankConfig(
      classId,
      bankBin,
      bankName,
      bankAccountNo,
      bankAccountHolder,
      actorId,
    )

    res.status(200).json({
      ok: true,
      message: "Cập nhật tài khoản ngân hàng của lớp thành công.",
      data: {
        bankBin: updated.bankBin,
        bankName: updated.bankName,
        bankAccountNo: updated.bankAccountNo,
        bankAccountHolder: updated.bankAccountHolder,
      },
    })
  } catch (error) {
    next(error)
  }
}
