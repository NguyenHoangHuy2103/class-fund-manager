import { Router } from "express"
import * as dashboardController from "./dashboard.controller.js"
import {
  requireAuth,
  requireClassRole,
} from "../../middleware/auth.middleware.js"

export const dashboardRouter = Router()

dashboardRouter.get(
  "/overview",
  requireAuth,
  requireClassRole("TREASURER", "MEMBER"),
  dashboardController.getOverview,
)
