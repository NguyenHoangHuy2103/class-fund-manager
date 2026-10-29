import { Router } from "express"
import * as dashboardController from "./dashboard.controller.js"
import { requireAuth } from "../../middleware/auth.middleware.js"

export const dashboardRouter = Router()

dashboardRouter.get("/", requireAuth, dashboardController.getDashboard)
