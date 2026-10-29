import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const BASE_URL = "http://localhost:4000/api"

interface CookieJar {
  [name: string]: string
}

function parseCookies(res: Response): CookieJar {
  const cookies: CookieJar = {}
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie") || ""]
  for (const str of raw) {
    if (!str) continue
    const parts = str.split(";")[0].split("=")
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join("=").trim()
    }
  }
  return cookies
}

function cookieHeader(jar: CookieJar): string {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ")
}

async function testE2E() {
  console.log("=== BẮT ĐẦU KIỂM TRA TRỌN LUỒNG GĐ1 TRÊN NEON POSTGRESQL ===")
  const ts = Date.now().toString().slice(-6)

  // 1. Đăng ký tài khoản
  console.log("\n[1] Kiểm tra Đăng ký tài khoản...")
  const email1 = `treasurer_${ts}@test.local`
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-bypass": "1" },
    body: JSON.stringify({
      email: email1,
      password: "Matkhau@123",
      fullName: `Thủ Quỹ Test ${ts}`,
    }),
  })
  const regJson = (await regRes.json()) as any
  if (!regRes.ok || !regJson.ok) {
    throw new Error(`Đăng ký thất bại: ${JSON.stringify(regJson)}`)
  }
  console.log("-> Đăng ký thành công:", regJson.data.email)

  // 2. Xem email preview local & lấy token xác thực
  console.log("\n[2] Kiểm tra Email Outbox Preview Local...")
  const outbox = await prisma.emailOutbox.findFirst({
    where: { toEmail: email1 },
    orderBy: { createdAt: "desc" },
  })
  if (!outbox) {
    throw new Error("Không tìm thấy email xác thực trong EmailOutbox!")
  }
  console.log("-> Tìm thấy email trong Outbox:", {
    id: outbox.id,
    subject: outbox.subject,
    status: outbox.status,
  })

  // Trích xuất token 64 ký tự từ htmlContent
  const match = outbox.htmlContent.match(/<b>([a-f0-9]{64})<\/b>/)
  if (!match) {
    throw new Error("Không trích xuất được verify token từ email outbox!")
  }
  const verifyToken = match[1]
  console.log("-> Trích xuất verifyToken thành công (SHA-256 token 64 hex)")

  // 3. Xác minh email
  console.log("\n[3] Kiểm tra Xác minh Email qua Token một lần...")
  const verRes = await fetch(`${BASE_URL}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-bypass": "1" },
    body: JSON.stringify({ token: verifyToken }),
  })
  const verJson = (await verRes.json()) as any
  if (!verRes.ok || !verJson.ok) {
    throw new Error(`Xác minh email thất bại: ${JSON.stringify(verJson)}`)
  }
  console.log("-> Xác minh email thành công:", verJson.message)

  // Thử xác minh lại bằng token cũ (phải bị từ chối vì dùng 1 lần)
  const reuseVerRes = await fetch(`${BASE_URL}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-bypass": "1" },
    body: JSON.stringify({ token: verifyToken }),
  })
  if (reuseVerRes.status === 400) {
    console.log("-> Token 1 lần đã được dọn sạch: Thử dùng lại bị từ chối 400 đúng như thiết kế!")
  } else {
    throw new Error("LỖI: Token dùng 1 lần không bị xóa sau khi xác minh!")
  }

  // 4. Đăng nhập & lấy cookies
  console.log("\n[4] Kiểm tra Đăng nhập & Cookies HttpOnly...")
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-bypass": "1" },
    body: JSON.stringify({ email: email1, password: "Matkhau@123" }),
  })
  const loginJson = (await loginRes.json()) as any
  if (!loginRes.ok || !loginJson.ok) {
    throw new Error(`Đăng nhập thất bại: ${JSON.stringify(loginJson)}`)
  }
  const user1Cookies = parseCookies(loginRes)
  const csrfToken1 = loginJson.data.csrfToken || user1Cookies["cf_csrf_token"]
  console.log("-> Đăng nhập thành công! Nhận cookies HttpOnly:", Object.keys(user1Cookies))

  // 5. Kiểm tra CSRF Protection
  console.log("\n[5] Kiểm tra CSRF Protection...")
  const noCsrfRes = await fetch(`${BASE_URL}/classes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(user1Cookies),
      // Cố tình không gửi x-csrf-token
    },
    body: JSON.stringify({
      code: `K15_${ts}`,
      name: `Lớp K15 Test ${ts}`,
      memberCode: `SE${ts}1`,
      displayName: `Thủ Quỹ ${ts}`,
    }),
  })
  if (noCsrfRes.status === 403) {
    console.log("-> CSRF Protection chặn thành công request thiếu header CSRF (403 Forbidden)")
  } else {
    throw new Error(`LỖI CSRF: Request không có CSRF token không bị chặn! Status: ${noCsrfRes.status}`)
  }

  // 6. Tạo lớp học mới (gửi kèm CSRF token)
  console.log("\n[6] Kiểm tra Tạo lớp học mới...")
  const createClassRes = await fetch(`${BASE_URL}/classes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(user1Cookies),
      "x-csrf-token": csrfToken1,
    },
    body: JSON.stringify({
      code: `K15_${ts}`,
      name: `Lớp K15 Test ${ts}`,
      memberCode: `SE${ts}1`,
      displayName: `Thủ Quỹ ${ts}`,
    }),
  })
  const createClassJson = (await createClassRes.json()) as any
  if (!createClassRes.ok || !createClassJson.ok) {
    throw new Error(`Tạo lớp thất bại: ${JSON.stringify(createClassJson)}`)
  }
  const createdClass = createClassJson.data.class
  const inviteCode = createdClass.inviteCode
  console.log("-> Tạo lớp thành công:", {
    id: createdClass.id,
    code: createdClass.code,
    inviteCode: createdClass.inviteCode,
  })

  // Thử tạo lớp lần 2 (phải bị chặn vì 1 user chỉ tạo tối đa 1 lớp)
  const createSecondRes = await fetch(`${BASE_URL}/classes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(user1Cookies),
      "x-csrf-token": csrfToken1,
    },
    body: JSON.stringify({
      code: `K15_DUP_${ts}`,
      name: `Lớp Trùng ${ts}`,
      memberCode: `SE${ts}2`,
      displayName: `Thủ Quỹ ${ts}`,
    }),
  })
  if (createSecondRes.status === 400) {
    console.log("-> Ràng buộc DB 1 user chỉ tạo 1 lớp hoạt động chính xác (400 Bad Request)")
  } else {
    throw new Error("LỖI: User tạo được lớp thứ hai!")
  }

  // 7. Tạo tài khoản thứ 2 và gửi yêu cầu tham gia lớp bằng mã mời
  console.log("\n[7] Kiểm tra Tài khoản khác tham gia bằng mã mời...")
  const email2 = `student_${ts}@test.local`
  await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-bypass": "1" },
    body: JSON.stringify({
      email: email2,
      password: "Matkhau@123",
      fullName: `Sinh Viên ${ts}`,
    }),
  })
  const outbox2 = await prisma.emailOutbox.findFirst({
    where: { toEmail: email2 },
    orderBy: { createdAt: "desc" },
  })
  const token2 = outbox2!.htmlContent.match(/<b>([a-f0-9]{64})<\/b>/)![1]
  await fetch(`${BASE_URL}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-bypass": "1" },
    body: JSON.stringify({ token: token2 }),
  })

  const loginRes2 = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-bypass": "1" },
    body: JSON.stringify({ email: email2, password: "Matkhau@123" }),
  })
  const user2Cookies = parseCookies(loginRes2)
  const loginJson2 = (await loginRes2.json()) as any
  const csrfToken2 = loginJson2.data.csrfToken || user2Cookies["cf_csrf_token"]

  const joinRes = await fetch(`${BASE_URL}/classes/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(user2Cookies),
      "x-csrf-token": csrfToken2,
    },
    body: JSON.stringify({
      inviteCode,
      memberCode: `SE${ts}9`,
      displayName: `Sinh Viên Tham Gia ${ts}`,
    }),
  })
  const joinJson = (await joinRes.json()) as any
  if (!joinRes.ok || !joinJson.ok) {
    throw new Error(`Tham gia lớp thất bại: ${JSON.stringify(joinJson)}`)
  }
  const pendingMemberId = joinJson.data.member.id
  console.log("-> Tham gia lớp thành công! Trạng thái thành viên:", joinJson.data.member.status)

  // 8. Thành viên chờ duyệt (PENDING) không được phép xem danh sách thành viên/quỹ
  console.log("\n[8] Kiểm tra Thành viên chờ duyệt KHÔNG xem được dữ liệu lớp...")
  const pendingAccessRes = await fetch(`${BASE_URL}/members`, {
    headers: {
      Cookie: cookieHeader(user2Cookies),
    },
  })
  if (pendingAccessRes.status === 403) {
    console.log("-> Thành viên PENDING bị chặn 403 Forbidden đúng thiết kế!")
  } else {
    throw new Error(`LỖI: Thành viên PENDING vẫn xem được dữ liệu! Status: ${pendingAccessRes.status}`)
  }

  // 9. Thủ quỹ phê duyệt thành viên
  console.log("\n[9] Kiểm tra Thủ quỹ phê duyệt thành viên...")
  const tqLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-bypass": "1" },
    body: JSON.stringify({ email: email1, password: "Matkhau@123" }),
  })
  const tqCookies = parseCookies(tqLoginRes)
  const tqCsrf = (await tqLoginRes.json()).data.csrfToken

  const approveRes = await fetch(`${BASE_URL}/members/${pendingMemberId}/approve`, {
    method: "PATCH",
    headers: {
      Cookie: cookieHeader(tqCookies),
      "x-csrf-token": tqCsrf,
    },
  })
  const approveJson = (await approveRes.json()) as any
  if (!approveRes.ok || !approveJson.ok) {
    throw new Error(`Phê duyệt thất bại: ${JSON.stringify(approveJson)}`)
  }
  console.log("-> Thủ quỹ phê duyệt thành công! Trạng thái mới:", approveJson.data.member.status)

  // 10. Đăng nhập lại user 2 (bây giờ đã là ACTIVE MEMBER) và kiểm tra quyền
  console.log("\n[10] Kiểm tra MEMBER sau khi ACTIVE được xem dữ liệu nhưng KHÔNG gọi được API Thủ quỹ...")
  const activeLogin2 = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-bypass": "1" },
    body: JSON.stringify({ email: email2, password: "Matkhau@123" }),
  })
  const activeCookies2 = parseCookies(activeLogin2)
  const activeCsrf2 = (await activeLogin2.json()).data.csrfToken

  // Member xem danh sách lớp -> Hợp lệ
  const memberListRes = await fetch(`${BASE_URL}/members`, {
    headers: { Cookie: cookieHeader(activeCookies2) },
  })
  if (memberListRes.ok) {
    const listJson = (await memberListRes.json()) as any
    console.log(`-> Thành viên ACTIVE xem được danh sách lớp (tìm thấy ${listJson.data.items.length} thành viên)`)
  } else {
    throw new Error("LỖI: Thành viên ACTIVE vẫn bị chặn xem danh sách lớp!")
  }

  // Member cố tình gọi API thủ quỹ: đổi mã mời -> Phải bị 403
  const illegalActionRes = await fetch(`${BASE_URL}/classes/invite-code`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(activeCookies2),
      "x-csrf-token": activeCsrf2,
    },
    body: JSON.stringify({ regenerate: true }),
  })
  if (illegalActionRes.status === 403) {
    console.log("-> MEMBER bị chặn khi gọi API Thủ quỹ (403 Forbidden)")
  } else {
    throw new Error(`LỖI: MEMBER gọi được API thủ quỹ! Status: ${illegalActionRes.status}`)
  }

  // 11. Đăng xuất & Thu hồi phiên (Session Revocation)
  console.log("\n[11] Kiểm tra Đăng xuất & Thu hồi phiên (Revoke Session)...")
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    headers: {
      Cookie: cookieHeader(activeCookies2),
      "x-csrf-token": activeCsrf2,
    },
  })
  if (!logoutRes.ok) {
    throw new Error("Đăng xuất thất bại!")
  }
  console.log("-> Đăng xuất thành công!")

  // Dùng lại refresh token cũ để refresh (kèm CSRF hợp lệ) -> Phải bị 401 do Session đã bị Revoked
  const reuseRefreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      Cookie: cookieHeader(activeCookies2),
      "x-csrf-token": activeCsrf2,
      "x-test-bypass": "1",
    },
  })
  console.log("-> Thử lại phiên cũ status:", reuseRefreshRes.status)
  if (reuseRefreshRes.status === 401) {
    console.log("-> Phiên cũ đã bị thu hồi trong Database: Gọi refresh bị từ chối 401 Unauthorized!")
  } else {
    throw new Error(`LỖI: Refresh token cũ vẫn dùng được sau khi đăng xuất! Status: ${reuseRefreshRes.status}`)
  }

  console.log("\n=== TẤT CẢ 11 TIÊU CHÍ KIỂM TRA TRỌN LUỒNG GĐ1 ĐỀU ĐẠT 100%! ===")
}

testE2E()
  .catch((err) => {
    console.error("❌ Kiểm tra thất bại:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
