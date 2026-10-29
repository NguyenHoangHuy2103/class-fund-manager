import { Router } from "express"
import * as collectionsController from "./collections.controller.js"
import {
  createCollectionSchema,
  updateCollectionStatusSchema,
  confirmPaymentSchema,
  collectionQuerySchema,
} from "./collections.schema.js"
import { validate } from "../../middleware/validate.middleware.js"
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js"

export const collectionsRouter = Router()

// Tất cả thành viên đã đăng nhập đều xem được đợt thu và tiến độ đóng của mình/lớp
collectionsRouter.get(
  "/",
  requireAuth,
  validate({ query: collectionQuerySchema }),
  collectionsController.getCollections,
)

collectionsRouter.get("/:id", requireAuth, collectionsController.getCollection)

// Chỉ ADMIN mới được tạo đợt thu, đóng đợt thu hoặc xác nhận tiền đóng
collectionsRouter.post(
  "/",
  requireRole("ADMIN"),
  validate({ body: createCollectionSchema }),
  collectionsController.createCollection,
)

collectionsRouter.patch(
  "/:id/status",
  requireRole("ADMIN"),
  validate({ body: updateCollectionStatusSchema }),
  collectionsController.updateCollectionStatus,
)

collectionsRouter.post(
  "/:id/payments",
  requireRole("ADMIN"),
  validate({ body: confirmPaymentSchema }),
  collectionsController.confirmPayment,
)
