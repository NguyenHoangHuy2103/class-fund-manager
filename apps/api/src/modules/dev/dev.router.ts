import { Router } from "express"
import { prisma } from "../../lib/prisma.js"
import { env } from "../../config/env.js"

export const devRouter = Router()

// Kiểm soát truy cập:
// 1. Tuyệt đối không phục vụ trên production (trả về 404 Not Found)
// 2. Cookie người dùng thông thường KHÔNG được phép đọc email của người khác
// 3. Yêu cầu x-dev-key khớp với DEV_API_KEY từ server
devRouter.use((req, res, next) => {
  if (env.NODE_ENV === "production") {
    res.status(404).json({
      ok: false,
      error: "Endpoint dev preview không tồn tại trên môi trường production.",
    })
    return
  }

  const devKey = req.headers["x-dev-key"]
  if (!devKey || devKey !== env.DEV_API_KEY) {
    res.status(403).json({
      ok: false,
      error:
        "Truy cập bị từ chối. Endpoint dev preview yêu cầu header x-dev-key quản trị dev hợp lệ.",
    })
    return
  }

  next()
})

// 1. Danh sách email gần nhất trong EmailOutbox (giới hạn 20 bản ghi)
devRouter.get("/emails", async (_req, res, next) => {
  try {
    if (env.NODE_ENV === "test") {
      res.status(200).json({ ok: true, data: { emails: [] } })
      return
    }

    const emails = await prisma.emailOutbox.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        toEmail: true,
        subject: true,
        status: true,
        createdAt: true,
        sentAt: true,
      },
    })

    res.status(200).json({
      ok: true,
      data: { emails },
    })
  } catch (error) {
    next(error)
  }
})

// 2. Lấy email mới nhất theo địa chỉ toEmail
devRouter.get("/emails/latest", async (req, res, next) => {
  try {
    const toEmail = req.query.toEmail as string
    if (!toEmail) {
      res.status(400).json({
        ok: false,
        error: "Vui lòng cung cấp tham số ?toEmail=<địa chỉ email>",
      })
      return
    }

    const email = await prisma.emailOutbox.findFirst({
      where: { toEmail },
      orderBy: { createdAt: "desc" },
    })

    if (!email) {
      res.status(404).json({
        ok: false,
        error: `Không tìm thấy email nào gửi tới ${toEmail}`,
      })
      return
    }

    res.status(200).json({
      ok: true,
      data: { email },
    })
  } catch (error) {
    next(error)
  }
})

// 3. Xem chi tiết nội dung preview email theo ID
devRouter.get("/emails/:id", async (req, res, next) => {
  try {
    const email = await prisma.emailOutbox.findUnique({
      where: { id: req.params.id },
    })

    if (!email) {
      res.status(404).json({
        ok: false,
        error: "Không tìm thấy email trong Outbox.",
      })
      return
    }

    res.status(200).json({
      ok: true,
      data: { email },
    })
  } catch (error) {
    next(error)
  }
})
