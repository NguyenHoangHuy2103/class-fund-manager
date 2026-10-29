import { Router } from "express"
import * as collectionsController from "./collections.controller.js"
import {
  createCollectionSchema,
  adjustObligationSchema,
  submitProofSchema,
  rejectProofSchema,
  batchApproveSchema,
  recordCashPaymentSchema,
  recordCashBatchSchema,
  getQrQuerySchema,
} from "./collections.schema.js"
import { validate } from "../../middleware/validate.middleware.js"
import {
  requireAuth,
  requireClassRole,
} from "../../middleware/auth.middleware.js"

export const collectionsRouter = Router()

// Tất cả endpoints đều yêu cầu đăng nhập
collectionsRouter.use(requireAuth)

// 1. Quản lý Đợt thu
collectionsRouter.post(
  "/",
  requireClassRole("TREASURER"),
  validate({ body: createCollectionSchema }),
  collectionsController.createCollection,
)

collectionsRouter.get(
  "/",
  requireClassRole("TREASURER", "MEMBER"),
  collectionsController.getCollections,
)

collectionsRouter.get(
  "/:id",
  requireClassRole("TREASURER", "MEMBER"),
  collectionsController.getCollectionDetail,
)

// 2. Sinh thông tin VietQR Napas247 cho đợt thu
collectionsRouter.get(
  "/:id/qr",
  requireClassRole("TREASURER", "MEMBER"),
  validate({ query: getQrQuerySchema }),
  collectionsController.getVietQr,
)

// 3. Điều chỉnh nghĩa vụ / Miễn giảm
collectionsRouter.patch(
  "/:id/members/:memberId/obligation",
  requireClassRole("TREASURER"),
  validate({ body: adjustObligationSchema }),
  collectionsController.adjustObligation,
)

// 4. Báo chuyển khoản (Nộp bill)
collectionsRouter.post(
  "/:id/proofs",
  requireClassRole("TREASURER", "MEMBER"),
  validate({ body: submitProofSchema }),
  collectionsController.submitProof,
)

collectionsRouter.get(
  "/:id/proofs",
  requireClassRole("TREASURER", "MEMBER"),
  collectionsController.getProofs,
)

// Danh sách toàn bộ proofs trong lớp (có filter)
collectionsRouter.get(
  "/proofs/all",
  requireClassRole("TREASURER", "MEMBER"),
  collectionsController.getProofs,
)

// 5. Duyệt / Từ chối bill chuyển khoản
collectionsRouter.patch(
  "/proofs/batch-approve",
  requireClassRole("TREASURER"),
  validate({ body: batchApproveSchema }),
  collectionsController.batchApproveProofs,
)

collectionsRouter.patch(
  "/proofs/:proofId/approve",
  requireClassRole("TREASURER"),
  collectionsController.approveProof,
)

collectionsRouter.patch(
  "/proofs/:proofId/reject",
  requireClassRole("TREASURER"),
  validate({ body: rejectProofSchema }),
  collectionsController.rejectProof,
)

// 6. Ghi nhận đóng tiền mặt (Đơn lẻ & Hàng loạt)
collectionsRouter.post(
  "/:id/payments/cash",
  requireClassRole("TREASURER"),
  validate({ body: recordCashPaymentSchema }),
  collectionsController.recordCashPayment,
)

collectionsRouter.post(
  "/:id/payments/cash-batch",
  requireClassRole("TREASURER"),
  validate({ body: recordCashBatchSchema }),
  collectionsController.recordCashBatch,
)
