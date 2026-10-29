import { Router } from "express"
import * as membersController from "./members.controller.js"
import {
  listMembersQuerySchema,
  setMemberStatusSchema,
} from "./members.schema.js"
import { validate } from "../../middleware/validate.middleware.js"
import {
  requireAuth,
  requireClassRole,
} from "../../middleware/auth.middleware.js"

export const membersRouter = Router()

// Tất cả thành viên trong lớp đều có thể xem danh sách lớp
membersRouter.get(
  "/",
  requireAuth,
  requireClassRole("TREASURER", "MEMBER"),
  validate({ query: listMembersQuerySchema }),
  membersController.listMembers,
)

// Chỉ Thủ quỹ mới có quyền Duyệt / Từ chối / Đổi trạng thái
membersRouter.patch(
  "/:id/approve",
  requireAuth,
  requireClassRole("TREASURER"),
  membersController.approveMember,
)

membersRouter.patch(
  "/:id/reject",
  requireAuth,
  requireClassRole("TREASURER"),
  membersController.rejectMember,
)

membersRouter.patch(
  "/:id/status",
  requireAuth,
  requireClassRole("TREASURER"),
  validate({ body: setMemberStatusSchema }),
  membersController.setMemberStatus,
)
