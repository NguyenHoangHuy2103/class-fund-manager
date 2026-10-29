import { Router } from "express"
import multer from "multer"
import * as storageController from "./storage.controller.js"
import { requireAuth } from "../../middleware/auth.middleware.js"

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
})

export const storageRouter = Router()

// Upload file: Yêu cầu đăng nhập, chỉ cho phép ảnh <= 5MB
storageRouter.post(
  "/upload",
  requireAuth,
  upload.single("file"),
  storageController.uploadFile,
)

// Tải / xem file: Yêu cầu đăng nhập và phân quyền nghiêm ngặt
storageRouter.get("/files/:id", requireAuth, storageController.getFile)
