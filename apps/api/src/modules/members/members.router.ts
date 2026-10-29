import { Router } from "express"
import * as membersController from "./members.controller.js"
import {
  createMemberSchema,
  updateMemberSchema,
  setMemberStatusSchema,
  memberQuerySchema,
} from "./members.schema.js"
import { validate } from "../../middleware/validate.middleware.js"
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js"

export const membersRouter = Router()

// Tất cả thành viên đã đăng nhập có thể xem danh sách lớp
membersRouter.get(
  "/",
  requireAuth,
  validate({ query: memberQuerySchema }),
  membersController.getMembers,
)

membersRouter.get("/:id", requireAuth, membersController.getMember)

// Chỉ ADMIN mới được thêm, sửa, đổi trạng thái
membersRouter.post(
  "/",
  requireRole("ADMIN"),
  validate({ body: createMemberSchema }),
  membersController.createMember,
)

membersRouter.put(
  "/:id",
  requireRole("ADMIN"),
  validate({ body: updateMemberSchema }),
  membersController.updateMember,
)

membersRouter.patch(
  "/:id/status",
  requireRole("ADMIN"),
  validate({ body: setMemberStatusSchema }),
  membersController.setMemberStatus,
)
