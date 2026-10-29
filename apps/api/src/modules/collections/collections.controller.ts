import type { Request, Response, NextFunction } from "express"
import * as collectionsService from "./collections.service.js"

export async function getCollections(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as any
    const user = req.user!

    const result = await collectionsService.listCollections({
      ...query,
      userId: user.userId,
      role: user.role,
      memberId: user.memberId,
    })

    res.status(200).json({ ok: true, data: result })
  } catch (error) {
    next(error)
  }
}

export async function getCollection(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!
    const result = await collectionsService.getCollectionDetail(
      req.params.id,
      user.memberId,
    )
    res.status(200).json({ ok: true, data: result })
  } catch (error) {
    next(error)
  }
}

export async function createCollection(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!
    const collection = await collectionsService.createCollection(
      req.body,
      user.userId,
    )
    res.status(201).json({
      ok: true,
      message: "Tạo đợt đóng quỹ mới thành công.",
      data: { collection },
    })
  } catch (error) {
    next(error)
  }
}

export async function updateCollectionStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const collection = await collectionsService.updateCollectionStatus(
      req.params.id,
      req.body.status,
    )
    res.status(200).json({
      ok: true,
      message:
        req.body.status === "OPEN"
          ? "Đã mở lại đợt thu quỹ."
          : "Đã đóng đợt thu quỹ.",
      data: { collection },
    })
  } catch (error) {
    next(error)
  }
}

export async function confirmPayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!
    const { memberId, note } = req.body
    const collectionId = req.params.id

    const result = await collectionsService.confirmMemberPayment({
      collectionId,
      memberId,
      adminUserId: user.userId,
      note,
    })

    res.status(201).json({
      ok: true,
      message: `Đã xác nhận đóng quỹ thành công cho ${result.payment.member.name} (${result.transaction.code}).`,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}
