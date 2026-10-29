import { Router, type Request, type Response } from "express"
import { requireAuth } from "../../middleware/auth.middleware.js"
import { realtimeEventBus } from "../../lib/events.js"
import { logger } from "../../lib/logger.js"

export const eventsRouter = Router()

/**
 * Server-Sent Events (SSE) endpoint:
 * Cho phép Client đăng ký nhận cập nhật thời gian thực (Real-time) cho lớp học hiện tại
 */
eventsRouter.get("/stream", requireAuth, (req: Request, res: Response): void => {
  const classId = req.user?.classId

  if (!classId) {
    res.status(400).json({
      ok: false,
      error: "Người dùng chưa tham gia hoặc chưa chọn lớp học để nhận thông báo real-time.",
    })
    return
  }

  // Cấu hình headers cho SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  })

  // Gửi thông điệp kết nối thành công ban đầu
  res.write(
    `data: ${JSON.stringify({
      type: "CONNECTED",
      classId,
      timestamp: new Date().toISOString(),
    })}\n\n`,
  )

  // Lắng nghe sự kiện của lớp học từ EventBus
  const listener = (event: any) => {
    try {
      res.write(
        `data: ${JSON.stringify({
          ...event,
          timestamp: new Date().toISOString(),
        })}\n\n`,
      )
    } catch (err: any) {
      logger.error("Lỗi gửi sự kiện SSE tới client:", err)
    }
  }

  realtimeEventBus.onClassEvent(classId, listener)

  // Heartbeat định kỳ 20 giây để giữ kết nối qua các proxy / load balancers
  const heartbeat = setInterval(() => {
    try {
      res.write(`:heartbeat\n\n`)
    } catch {
      // Ignored
    }
  }, 20000)

  // Dọn dẹp listener khi client ngắt kết nối
  req.on("close", () => {
    clearInterval(heartbeat)
    realtimeEventBus.offClassEvent(classId, listener)
  })
})
