import { app } from "./app.js"
import { env } from "./config/env.js"
import { logger } from "./lib/logger.js"
import { prisma } from "./lib/prisma.js"

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 API Server đang chạy tại http://localhost:${env.PORT}`)
  logger.info(`Môi trường: ${env.NODE_ENV}`)
  logger.info(`Health check: http://localhost:${env.PORT}/api/health`)
})

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`Nhận tín hiệu ${signal}. Đang tiến hành đóng máy chủ an toàn...`)

  server.close(async () => {
    logger.info("HTTP server đã đóng các kết nối đang xử lý.")
    try {
      await prisma.$disconnect()
      logger.info("Đã ngắt kết nối cơ sở dữ liệu Prisma an toàn.")
      process.exit(0)
    } catch (err) {
      logger.error("Lỗi khi đóng kết nối Prisma:", err)
      process.exit(1)
    }
  })

  // Cưỡng chế dừng nếu mất quá 10 giây
  setTimeout(() => {
    logger.error("Quá thời gian chờ shutdown, tiến hành dừng khẩn cấp.")
    process.exit(1)
  }, 10000).unref()
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))
