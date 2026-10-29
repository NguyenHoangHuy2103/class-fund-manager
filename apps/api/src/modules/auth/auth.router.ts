import { Router } from "express"
import * as authController from "./auth.controller.js"
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.schema.js"
import { validate } from "../../middleware/validate.middleware.js"
import { requireAuth } from "../../middleware/auth.middleware.js"
import { loginRateLimiter } from "../../middleware/rateLimit.middleware.js"

export const authRouter = Router()

// Public Auth Endpoints
authRouter.post(
  "/register",
  loginRateLimiter(5, 15 * 60 * 1000), // Tối đa 5 lần đăng ký / 15 phút theo IP
  validate({ body: registerSchema }),
  authController.register,
)

authRouter.post(
  "/login",
  loginRateLimiter(10, 15 * 60 * 1000), // Tối đa 10 lần đăng nhập sai / 15 phút
  validate({ body: loginSchema }),
  authController.login,
)

authRouter.post("/refresh", authController.refresh)

authRouter.post(
  "/verify-email",
  validate({ body: verifyEmailSchema }),
  authController.verifyEmail,
)

authRouter.post(
  "/forgot-password",
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword,
)

authRouter.post(
  "/reset-password",
  validate({ body: resetPasswordSchema }),
  authController.resetPassword,
)

// Google OAuth
authRouter.get("/google/url", authController.getGoogleOAuthUrl)
authRouter.get("/google/callback", authController.handleGoogleCallback)

// CSRF Token retrieval
authRouter.get("/csrf-token", authController.getCsrfToken)

// Authenticated Endpoints
authRouter.post("/logout", requireAuth, authController.logout)
authRouter.get("/me", requireAuth, authController.getMe)
