import type { Request, Response, NextFunction } from "express"
import * as collectionsService from "./collections.service.js"

export async function createCollection(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const classId = req.user!.classId!
    const actorId = req.user!.userId
    const { name, defaultAmount, dueDate, description, targetMemberIds } = req.body

    const result = await collectionsService.createCollection({
      classId,
      name,
      defaultAmount,
      dueDate,
      description,
      targetMemberIds,
      actorId,
    })

    res.status(201).json({
      ok: true,
      message: "Tạo đợt thu quỹ thành công.",
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function getCollections(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const classId = req.user!.classId!
    const periodId = req.query.periodId as string | undefined

    const collections = await collectionsService.getCollections(classId, periodId)
    res.status(200).json({
      ok: true,
      data: { collections },
    })
  } catch (error) {
    next(error)
  }
}

export async function getCollectionDetail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const classId = req.user!.classId!
    const collectionId = req.params.id

    const collection = await collectionsService.getCollectionDetail(
      classId,
      collectionId,
      {
        userId: req.user!.userId,
        classRole: req.user!.classRole,
        memberId: req.user!.memberId,
        globalRole: req.user!.globalRole,
      },
    )

    res.status(200).json({
      ok: true,
      data: { collection },
    })
  } catch (error) {
    next(error)
  }
}

export async function adjustObligation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const classId = req.user!.classId!
    const collectionId = req.params.id
    const memberId = req.params.memberId
    const { targetAmount, discountReason } = req.body
    const actorId = req.user!.userId

    const result = await collectionsService.adjustObligation({
      classId,
      collectionId,
      memberId,
      targetAmount,
      discountReason,
      actorId,
    })

    res.status(200).json({
      ok: true,
      message: "Cập nhật nghĩa vụ đóng tiền thành công.",
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function getVietQr(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const classId = req.user!.classId!
    const collectionId = req.params.id
    const { memberId, customAmount } = req.query

    const result = await collectionsService.getVietQrInfo({
      classId,
      collectionId,
      memberId: memberId as string | undefined,
      customAmount: customAmount as string | undefined,
      reqUserMemberId: req.user!.memberId,
    })

    res.status(200).json({
      ok: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function submitProof(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const classId = req.user!.classId!
    const collectionId = req.params.id
    const classMemberId = req.user!.memberId!
    const { amount, fileId, transferCode, note, idempotencyKey } = req.body
    const actorUserId = req.user!.userId

    const result = await collectionsService.submitPaymentProof({
      classId,
      collectionId,
      classMemberId,
      amount,
      fileId,
      transferCode,
      note,
      idempotencyKey,
      actorUserId,
    })

    res.status(result.isReplay ? 200 : 201).json({
      ok: true,
      message: result.isReplay
        ? "Yêu cầu báo chuyển khoản này đã được ghi nhận trước đó."
        : "Nộp bằng chứng chuyển khoản thành công. Vui lòng chờ Thủ quỹ phê duyệt.",
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function getProofs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const classId = req.user!.classId!
    const collectionId = req.query.collectionId as string | undefined
    const status = req.query.status as "PENDING" | "APPROVED" | "REJECTED" | undefined

    const proofs = await collectionsService.getProofs({
      classId,
      collectionId,
      status,
      user: {
        userId: req.user!.userId,
        classRole: req.user!.classRole,
        memberId: req.user!.memberId,
        globalRole: req.user!.globalRole,
      },
    })

    res.status(200).json({
      ok: true,
      data: { proofs },
    })
  } catch (error) {
    next(error)
  }
}

export async function approveProof(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const classId = req.user!.classId!
    const proofId = req.params.proofId
    const actorId = req.user!.userId
    const actorMemberId = req.user!.memberId!
    const { actualAmount } = req.body || {}

    const result = await collectionsService.approvePaymentProof({
      classId,
      proofId,
      actorId,
      actorMemberId,
      actualAmount,
    })

    res.status(200).json({
      ok: true,
      message: "Duyệt bằng chứng chuyển khoản thành công.",
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function batchApproveProofs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const classId = req.user!.classId!
    const { proofIds } = req.body
    const actorId = req.user!.userId
    const actorMemberId = req.user!.memberId!

    const result = await collectionsService.batchApproveProofs({
      classId,
      proofIds,
      actorId,
      actorMemberId,
    })

    res.status(200).json({
      ok: true,
      message: `Đã duyệt thành công ${result.successCount}/${result.total} bằng chứng chuyển khoản.`,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function rejectProof(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const classId = req.user!.classId!
    const proofId = req.params.proofId
    const { rejectReason } = req.body
    const actorId = req.user!.userId
    const actorMemberId = req.user!.memberId!

    const result = await collectionsService.rejectPaymentProof({
      classId,
      proofId,
      rejectReason,
      actorId,
      actorMemberId,
    })

    res.status(200).json({
      ok: true,
      message: "Đã từ chối bằng chứng chuyển khoản.",
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function recordCashPayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const classId = req.user!.classId!
    const collectionId = req.params.id
    const { classMemberId, amount, note, idempotencyKey } = req.body
    const actorId = req.user!.userId
    const actorMemberId = req.user!.memberId!

    const result = await collectionsService.recordCashPayment({
      classId,
      collectionId,
      classMemberId,
      amount,
      note,
      idempotencyKey,
      actorId,
      actorMemberId,
    })

    res.status(result.isReplay ? 200 : 201).json({
      ok: true,
      message: result.isReplay
        ? "Khoản thu tiền mặt này đã được ghi nhận trước đó."
        : "Ghi nhận đóng tiền mặt thành công.",
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function recordCashBatch(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const classId = req.user!.classId!
    const collectionId = req.params.id
    const { items, idempotencyKey } = req.body
    const actorId = req.user!.userId
    const actorMemberId = req.user!.memberId!

    const result = await collectionsService.recordCashBatch({
      classId,
      collectionId,
      items,
      idempotencyKey,
      actorId,
      actorMemberId,
    })

    res.status(200).json({
      ok: true,
      message: `Đã thu tiền mặt thành công ${result.successCount}/${result.total} thành viên.`,
      data: result,
    })
  } catch (error)
  {
    next(error)
  }
}
