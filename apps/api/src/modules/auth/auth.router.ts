import { Router } from "express"
import * as authController from "./auth.controller.js"
import { loginSchema } from "./auth.schema.js"
import { validate } from "../../middleware/validate.middleware.js"
import { requireAuth } from "../../middleware/auth.middleware.js"
import { loginRateLimiter } from "../../middleware/rateLimit.middleware.js"

export const authRouter = Router()

authRouter.post(
  "/login",
  loginRateLimiter(),
  validate({ body: loginSchema }),
  authController.login,
)

authRouter.post("/logout", authController.logout)

authRouter.get("/me", requireAuth, authController.getMe)
