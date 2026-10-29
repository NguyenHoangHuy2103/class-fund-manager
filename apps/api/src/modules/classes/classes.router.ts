import { Router } from "express"
import * as classesController from "./classes.controller.js"
import {
  createClassSchema,
  joinClassSchema,
  updateInviteCodeSchema,
  updateBankConfigSchema,
} from "./classes.schema.js"
import { validate } from "../../middleware/validate.middleware.js"
import {
  requireAuth,
  requireClassRole,
} from "../../middleware/auth.middleware.js"

export const classesRouter = Router()

classesRouter.post(
  "/",
  requireAuth,
  validate({ body: createClassSchema }),
  classesController.createClass,
)

classesRouter.post(
  "/join",
  requireAuth,
  validate({ body: joinClassSchema }),
  classesController.joinClass,
)

classesRouter.post("/reapply", requireAuth, classesController.reapply)
classesRouter.post("/cancel-request", requireAuth, classesController.cancelJoin)

classesRouter.get("/current", requireAuth, classesController.getCurrentClass)

classesRouter.patch(
  "/invite-code",
  requireAuth,
  requireClassRole("TREASURER"),
  validate({ body: updateInviteCodeSchema }),
  classesController.updateInviteCode,
)

classesRouter.patch(
  "/bank-config",
  requireAuth,
  requireClassRole("TREASURER"),
  validate({ body: updateBankConfigSchema }),
  classesController.updateBankConfig,
)
