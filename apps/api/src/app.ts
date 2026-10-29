import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import helmet from "helmet"
import { allowedOrigins } from "./config/env.js"
import { authenticate } from "./middleware/auth.middleware.js"
import { csrfProtection } from "./middleware/csrf.middleware.js"
import { notFoundHandler, errorHandler } from "./middleware/error.middleware.js"
import { prisma } from "./lib/prisma.js"

// Routers
import { authRouter } from "./modules/auth/auth.router.js"
import { classesRouter } from "./modules/classes/classes.router.js"
import { membersRouter } from "./modules/members/members.router.js"
import { collectionsRouter } from "./modules/collections/collections.router.js"
import { transactionsRouter } from "./modules/transactions/transactions.router.js"
import { dashboardRouter } from "./modules/dashboard/dashboard.router.js"
import { storageRouter } from "./modules/storage/storage.router.js"
import { eventsRouter } from "./modules/events/events.router.js"
import { devRouter } from "./modules/dev/dev.router.js"
import { env } from "./config/env.js"

export const app = express()

// Bảo mật tiêu chuẩn
app.use(helmet())

// Cấu hình CORS với allowlist, hỗ trợ credentials, không dùng wildcard
app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép requests không có origin (như mobile apps, curl, server-to-server) hoặc thuộc allowlist
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(
          new Error(
            `Origin ${origin} không được phép truy cập theo chính sách CORS.`,
          ),
        )
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-csrf-token",
      "X-Requested-With",
      "x-test-bypass",
      "x-dev-key",
      "X-CSRF-Protection",
    ],
  }),
)

app.use(express.json())
app.use(cookieParser())

// Xác thực danh tính từ token nếu có
app.use(authenticate)

// Chống CSRF cho các yêu cầu thay đổi dữ liệu
app.use(csrfProtection)

// 1. Health check & DB readiness check
app.get("/api/health", async (_req, res) => {
  try {
    // Kiểm tra kết nối cơ sở dữ liệu
    await prisma.$queryRaw`SELECT 1`
    res.status(200).json({
      ok: true,
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(503).json({
      ok: false,
      status: "unhealthy",
      database: "disconnected",
      error: error instanceof Error ? error.message : "Database check failed",
      timestamp: new Date().toISOString(),
    })
  }
})

// 2. Các module chức năng chính
app.use("/api/auth", authRouter)
app.use("/api/classes", classesRouter)
app.use("/api/members", membersRouter)
app.use("/api/collections", collectionsRouter)
app.use("/api/transactions", transactionsRouter)
app.use("/api/dashboard", dashboardRouter)
app.use("/api/storage", storageRouter)
app.use("/api/events", eventsRouter)

// Endpoint dev preview (chỉ mount khi không phải production)
if (env.NODE_ENV !== "production") {
  app.use("/api/dev", devRouter)
}

// 3. Xử lý lỗi tập trung
app.use(notFoundHandler)
app.use(errorHandler)
