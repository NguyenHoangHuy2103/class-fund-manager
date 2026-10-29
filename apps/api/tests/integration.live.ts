import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const BASE_URL = "http://localhost:4000/api"

interface CookieJar {
  [name: string]: string
}

function parseCookies(res: Response): CookieJar {
  const cookies: CookieJar = {}
  const raw = res.headers.getSetCookie
    ? res.headers.getSetCookie()
    : [res.headers.get("set-cookie") || ""]
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

async function runIntegrationTests() {
  console.log("=== BẮT ĐẦU KIỂM THỬ TÍCH HỢP TOÀN DIỆN TRÊN NEON POSTGRESQL ===")
  const ts = Date.now().toString().slice(-6)

  // 1. Đăng ký tài khoản Thủ quỹ 1
  console.log("\n[1] Kiểm tra Đăng ký tài khoản (User 1)...")
  const email1 = `treasurer_${ts}@test.local`
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-bypass": "1" },
    body: JSON.stringify({
      email: email1,
      password: "Matkhau@123",
      fullName: `Thủ Quỹ 1 ${ts}`,
    }),
  })
  const regJson = (await regRes.json()) as any
  if (!regRes.ok || !regJson.ok) {
    throw new Error(`Đăng ký thất bại: ${JSON.stringify(regJson)}`)
  }
  console.log("-> Đăng ký thành công:", regJson.data.email)

  // 2. Dev Email Preview (Không in token ra console, lấy qua dev endpoint có kiểm soát)
  console.log("\n[2] Kiểm tra Dev Email Preview Endpoint...")
  const devEmailRes = await fetch(
    `${BASE_URL}/dev/emails/latest?toEmail=${encodeURIComponent(email1)}`,
    {
      headers: { "x-dev-key": "cf_dev_preview_secret_key_2026" },
    },
  )
  if (!devEmailRes.ok) {
    throw new Error(`Lỗi gọi Dev Email Preview: ${devEmailRes.status}`)
  }
  const devEmailJson = (await devEmailRes.json()) as any
  const outbox = devEmailJson.data.email
  console.log("-> Dev Preview thành công (Email ID:", outbox.id, "- Subject:", outbox.subject, ")")

  const match = outbox.htmlContent.match(/<b>([a-f0-9]{64})<\/b>/)
  if (!match) {
    throw new Error("Không trích xuất được verify token từ email preview!")
  }
  const verifyToken = match[1]

  // 3. Xác thực Email bằng token 1 lần
  console.log("\n[3] Kiểm tra Xác thực Email bằng token 1 lần...")
  const verifyRes = await fetch(`${BASE_URL}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: verifyToken }),
  })
  if (!verifyRes.ok) {
    throw new Error("Xác thực email thất bại!")
  }
  console.log("-> Xác thực email thành công!")

  // Dùng lại token xác thực -> Phải bị 400
  const reuseVerifyRes = await fetch(`${BASE_URL}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: verifyToken }),
  })
  if (reuseVerifyRes.status === 400) {
    console.log("-> Chặn dùng lại token xác thực thành công (HTTP 400)!")
  } else {
    throw new Error(`LỖI: Token dùng lại không bị chặn! Status: ${reuseVerifyRes.status}`)
  }

  // 4. Đăng nhập User 1
  console.log("\n[4] Kiểm tra Đăng nhập & Nhận HttpOnly Cookie...")
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-bypass": "1" },
    body: JSON.stringify({ email: email1, password: "Matkhau@123" }),
  })
  if (!loginRes.ok) {
    throw new Error("Đăng nhập thất bại!")
  }
  const cookies1 = parseCookies(loginRes)
  const loginJson = (await loginRes.json()) as any
  const csrf1 = loginJson.data.csrfToken

  if (!cookies1["cf_access_token"] || !cookies1["cf_refresh_token"]) {
    throw new Error("Không tìm thấy HttpOnly cookies!")
  }
  console.log("-> Đăng nhập thành công, nhận cf_access_token & cf_refresh_token")

  // 5. Kiểm thử bảo vệ CSRF toàn diện
  console.log("\n[5] Kiểm thử CSRF (Thiếu header / Sai token / Khác phiên)...")
  // A. Thiếu header
  const noHeaderCsrf = await fetch(`${BASE_URL}/classes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(cookies1),
    },
    body: JSON.stringify({ code: `C1_${ts}`, name: `Lớp 1 ${ts}` }),
  })
  if (noHeaderCsrf.status === 403) {
    console.log("-> CSRF Check 1 (Thiếu header): Bị từ chối 403 Forbidden!")
  } else {
    throw new Error(`LỖI: Request thiếu header CSRF không bị 403! Status: ${noHeaderCsrf.status}`)
  }

  // B. Sai token
  const wrongTokenCsrf = await fetch(`${BASE_URL}/classes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(cookies1),
      "x-csrf-token": "wrong-token-value",
    },
    body: JSON.stringify({ code: `C1_${ts}`, name: `Lớp 1 ${ts}` }),
  })
  if (wrongTokenCsrf.status === 403) {
    console.log("-> CSRF Check 2 (Sai token): Bị từ chối 403 Forbidden!")
  } else {
    throw new Error(`LỖI: Request sai CSRF token không bị 403! Status: ${wrongTokenCsrf.status}`)
  }

  // C. Token của phiên khác (mismatch cookie vs header)
  const mismatchCsrf = await fetch(`${BASE_URL}/classes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader({ ...cookies1, cf_csrf_token: "victim-cookie-token" }),
      "x-csrf-token": "attacker-header-token",
    },
    body: JSON.stringify({ code: `C1_${ts}`, name: `Lớp 1 ${ts}` }),
  })
  if (mismatchCsrf.status === 403) {
    console.log("-> CSRF Check 3 (Token khác phiên mismatch): Bị từ chối 403 Forbidden!")
  } else {
    throw new Error(`LỖI: Mismatch CSRF token không bị 403! Status: ${mismatchCsrf.status}`)
  }

  // D. Cookie thường không đọc được dev email preview
  const unauthDevEmail = await fetch(`${BASE_URL}/dev/emails`, {
    headers: { Cookie: cookieHeader(cookies1) },
  })
  if (unauthDevEmail.status === 403) {
    console.log("-> Dev Preview Check (Cookie người dùng thường bị từ chối): HTTP 403 Forbidden!")
  } else {
    throw new Error(`LỖI: Cookie người dùng thường đọc được dev email! Status: ${unauthDevEmail.status}`)
  }

  // 6. Tạo Lớp 1 (User 1 làm Thủ quỹ Lớp 1)
  console.log("\n[6] Kiểm tra Tạo Lớp 1 & Ràng buộc 1 User chỉ tạo 1 Lớp...")
  const createClassRes = await fetch(`${BASE_URL}/classes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(cookies1),
      "x-csrf-token": csrf1,
    },
    body: JSON.stringify({
      code: `K15_A_${ts}`,
      name: `Kỹ thuật Phần mềm K15A ${ts}`,
      memberCode: `MSSV_${ts}_1`,
      displayName: `Thủ Quỹ 1 ${ts}`,
    }),
  })
  const classJson = (await createClassRes.json()) as any
  if (!createClassRes.ok || !classJson.ok) {
    throw new Error(`Tạo lớp 1 thất bại: ${JSON.stringify(classJson)}`)
  }
  const class1Id = classJson.data.class.id
  const inviteCode1 = classJson.data.class.inviteCode
  console.log(`-> Tạo Lớp 1 thành công (ID: ${class1Id}, Mã mời: ${inviteCode1})`)

  // User 1 thử tạo lớp thứ 2 -> Phải bị 400
  const secondClassRes = await fetch(`${BASE_URL}/classes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(cookies1),
      "x-csrf-token": csrf1,
    },
    body: JSON.stringify({
      code: `K15_A2_${ts}`,
      name: `Lớp Thứ 2 ${ts}`,
      memberCode: `MSSV_${ts}_1_B`,
      displayName: `Thủ Quỹ 1 Lần 2`,
    }),
  })
  if (secondClassRes.status === 400) {
    console.log("-> Ràng buộc 1 user chỉ tạo 1 lớp thành công (HTTP 400)!")
  } else {
    throw new Error(`LỖI: Tạo được lớp thứ 2! Status: ${secondClassRes.status}`)
  }

  // 7. Tạo User 2 và tham gia Lớp 1 (status: PENDING)
  console.log("\n[7] Đăng ký User 2 và gửi yêu cầu tham gia Lớp 1...")
  const email2 = `member_${ts}@test.local`
  await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-bypass": "1" },
    body: JSON.stringify({
      email: email2,
      password: "Matkhau@123",
      fullName: `Thành Viên 2 ${ts}`,
    }),
  })

  // Verify email User 2
  const email2Res = await fetch(
    `${BASE_URL}/dev/emails/latest?toEmail=${encodeURIComponent(email2)}`,
    { headers: { "x-dev-key": "cf_dev_preview_secret_key_2026" } },
  )
  const token2 = (await email2Res.json()).data.email.htmlContent.match(/<b>([a-f0-9]{64})<\/b>/)[1]
  await fetch(`${BASE_URL}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: token2 }),
  })

  // Đăng nhập User 2
  const login2 = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-bypass": "1" },
    body: JSON.stringify({ email: email2, password: "Matkhau@123" }),
  })
  const cookies2 = parseCookies(login2)
  const csrf2 = (await login2.json()).data.csrfToken

  // TEST BẮT BUỘC: Giữ cookie đăng nhập phiên 1 (Thủ quỹ 1), nhưng thay cả cookie CSRF và header bằng CSRF token hợp lệ của Phiên 2 (csrf2)
  const sessionSwappedCsrf = await fetch(`${BASE_URL}/classes/invite-code`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader({ ...cookies1, cf_csrf_token: csrf2 }),
      "x-csrf-token": csrf2,
    },
    body: JSON.stringify({ regenerate: true }),
  })
  if (sessionSwappedCsrf.status === 403) {
    console.log("-> TEST BẮT BUỘC ĐẠT: Giữ cookie phiên 1, gửi token hợp lệ phiên 2 cho cả cookie và header -> Bị chặn 403 Forbidden (Session-bound CSRF)!")
  } else {
    throw new Error(`LỖI BẢO MẬT: Token của phiên khác dùng được trên phiên 1! Status: ${sessionSwappedCsrf.status}`)
  }

  // Xin vào Lớp 1
  const joinRes = await fetch(`${BASE_URL}/classes/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(cookies2),
      "x-csrf-token": csrf2,
    },
    body: JSON.stringify({
      inviteCode: inviteCode1,
      memberCode: `MSSV_${ts}_2`,
      displayName: `Sinh Viên 2 ${ts}`,
    }),
  })
  const joinJson = (await joinRes.json()) as any
  if (!joinRes.ok || !joinJson.ok) {
    throw new Error(`Xin vào lớp thất bại: ${JSON.stringify(joinJson)}`)
  }
  const member2Id = joinJson.data.member.id
  console.log(`-> User 2 xin vào Lớp 1 thành công (Member ID: ${member2Id}, Status: ${joinJson.data.member.status})`)

  // 8. Kiểm tra PENDING không được đọc dữ liệu lớp
  console.log("\n[8] Kiểm tra User PENDING bị chặn đọc dữ liệu lớp...")
  const pendingReadRes = await fetch(`${BASE_URL}/members`, {
    headers: { Cookie: cookieHeader(cookies2) },
  })
  if (pendingReadRes.status === 403) {
    console.log("-> User PENDING bị chặn đọc danh sách thành viên (HTTP 403)!")
  } else {
    throw new Error(`LỖI: PENDING đọc được danh sách lớp! Status: ${pendingReadRes.status}`)
  }

  // 9. Kiểm tra truy cập chéo lớp (Cross-tenant Isolation)
  console.log("\n[9] Kiểm tra Truy cập chéo lớp: Thủ quỹ Lớp B không thể can thiệp Lớp A...")
  // Tạo User 3 làm Thủ quỹ Lớp B
  const email3 = `treasurer_b_${ts}@test.local`
  await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-bypass": "1" },
    body: JSON.stringify({
      email: email3,
      password: "Matkhau@123",
      fullName: `Thủ Quỹ B ${ts}`,
    }),
  })
  const email3Res = await fetch(
    `${BASE_URL}/dev/emails/latest?toEmail=${encodeURIComponent(email3)}`,
    { headers: { "x-dev-key": "cf_dev_preview_secret_key_2026" } },
  )
  const token3 = (await email3Res.json()).data.email.htmlContent.match(/<b>([a-f0-9]{64})<\/b>/)[1]
  await fetch(`${BASE_URL}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: token3 }),
  })
  const login3 = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-bypass": "1" },
    body: JSON.stringify({ email: email3, password: "Matkhau@123" }),
  })
  const cookies3 = parseCookies(login3)
  const csrf3 = (await login3.json()).data.csrfToken

  // Tạo Lớp B
  await fetch(`${BASE_URL}/classes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(cookies3),
      "x-csrf-token": csrf3,
    },
    body: JSON.stringify({
      code: `K15_B_${ts}`,
      name: `Kỹ thuật Phần mềm K15B ${ts}`,
      memberCode: `MSSV_${ts}_3`,
      displayName: `Thủ Quỹ B ${ts}`,
    }),
  })

  // Đăng nhập lại User 3 để access token nhận vai trò TREASURER Lớp B
  const reLogin3 = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-bypass": "1" },
    body: JSON.stringify({ email: email3, password: "Matkhau@123" }),
  })
  const reCookies3 = parseCookies(reLogin3)
  const reCsrf3 = (await reLogin3.json()).data.csrfToken

  // Thủ quỹ Lớp B thử duyệt Member 2 (thuộc Lớp A) bằng cách truyền member2Id
  const crossApproveRes = await fetch(`${BASE_URL}/members/${member2Id}/approve`, {
    method: "PATCH",
    headers: {
      Cookie: cookieHeader(reCookies3),
      "x-csrf-token": reCsrf3,
    },
  })
  if (crossApproveRes.status === 404) {
    console.log("-> Thủ quỹ Lớp B duyệt thành viên Lớp A bị chặn: 404 Not Found (Cross-tenant Isolation OK)!")
  } else {
    throw new Error(`LỖI: Chặn truy cập chéo lớp thất bại! Status: ${crossApproveRes.status}`)
  }

  // 10. Thủ quỹ Lớp A duyệt User 2 vào Lớp A
  console.log("\n[10] Thủ quỹ Lớp A duyệt User 2...")
  // Đăng nhập lại User 1 để có token chứa classRole TREASURER
  const reLogin1 = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-bypass": "1" },
    body: JSON.stringify({ email: email1, password: "Matkhau@123" }),
  })
  const reCookies1 = parseCookies(reLogin1)
  const reCsrf1 = (await reLogin1.json()).data.csrfToken

  const approveRes = await fetch(`${BASE_URL}/members/${member2Id}/approve`, {
    method: "PATCH",
    headers: {
      Cookie: cookieHeader(reCookies1),
      "x-csrf-token": reCsrf1,
    },
  })
  if (!approveRes.ok) {
    throw new Error(`Thủ quỹ duyệt thất bại: ${approveRes.status}`)
  }
  console.log("-> Thủ quỹ Lớp A duyệt thành công!")

  // 11. User 2 đăng nhập lại (ACTIVE MEMBER)
  console.log("\n[11] User 2 đăng nhập với vai trò ACTIVE MEMBER...")
  const activeLogin2 = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-bypass": "1" },
    body: JSON.stringify({ email: email2, password: "Matkhau@123" }),
  })
  const activeCookies2 = parseCookies(activeLogin2)
  const activeCsrf2 = (await activeLogin2.json()).data.csrfToken

  // ACTIVE MEMBER đọc danh sách thành viên Lớp A
  const memberListRes = await fetch(`${BASE_URL}/members`, {
    headers: { Cookie: cookieHeader(activeCookies2) },
  })
  if (memberListRes.ok) {
    console.log("-> ACTIVE MEMBER đọc được danh sách lớp!")
  } else {
    throw new Error(`LỖI: ACTIVE MEMBER không đọc được danh sách lớp! Status: ${memberListRes.status}`)
  }

  // ACTIVE MEMBER cố tình gọi API Thủ quỹ -> Bị 403
  const illegalRes = await fetch(`${BASE_URL}/classes/invite-code`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(activeCookies2),
      "x-csrf-token": activeCsrf2,
    },
    body: JSON.stringify({ regenerate: true }),
  })
  if (illegalRes.status === 403) {
    console.log("-> ACTIVE MEMBER bị chặn khi gọi API Thủ quỹ (HTTP 403)!")
  } else {
    throw new Error(`LỖI: MEMBER gọi được API Thủ quỹ! Status: ${illegalRes.status}`)
  }

  // 12. KIỂM THỬ THU HỒI ACCESS TOKEN SAU KHI LOGOUT
  console.log("\n[12] Kiểm thử Access Token cũ sau khi Logout...")
  // Lưu cookie access token trước khi logout
  const savedAccessCookie = activeCookies2["cf_access_token"]
  if (!savedAccessCookie) {
    throw new Error("Không có cf_access_token để lưu!")
  }

  // Thực hiện Logout
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    headers: {
      Cookie: cookieHeader(activeCookies2),
      "x-csrf-token": activeCsrf2,
    },
  })
  if (!logoutRes.ok) {
    throw new Error("Logout thất bại!")
  }
  console.log("-> Đăng xuất thành công!")

  // Gửi lại access cookie cũ tới API bảo vệ (/api/auth/me) -> Phải bị từ chối 401
  const reuseAccessAfterLogout = await fetch(`${BASE_URL}/auth/me`, {
    headers: {
      Cookie: `cf_access_token=${savedAccessCookie}`,
    },
  })
  if (reuseAccessAfterLogout.status === 401) {
    console.log("-> Access Token cũ bị từ chối sau Logout: HTTP 401 Unauthorized (Phiên đã bị thu hồi)!")
  } else {
    throw new Error(
      `LỖI BẢO MẬT: Access Token cũ vẫn dùng được sau Logout! Status: ${reuseAccessAfterLogout.status}`,
    )
  }

  // 13. KIỂM THỬ THU HỒI ACCESS TOKEN SAU KHI RESET MẬT KHẨU
  console.log("\n[13] Kiểm thử Access Token cũ sau khi Reset Mật khẩu...")
  // Đăng nhập lại User 2 để lấy session mới
  const loginBeforeReset = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-bypass": "1" },
    body: JSON.stringify({ email: email2, password: "Matkhau@123" }),
  })
  const cookiesBeforeReset = parseCookies(loginBeforeReset)
  const accessBeforeReset = cookiesBeforeReset["cf_access_token"]

  // Yêu cầu quên mật khẩu
  await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email2 }),
  })

  // Lấy reset token từ dev preview
  const resetEmailRes = await fetch(
    `${BASE_URL}/dev/emails/latest?toEmail=${encodeURIComponent(email2)}`,
    { headers: { "x-dev-key": "cf_dev_preview_secret_key_2026" } },
  )
  const resetToken = (await resetEmailRes.json()).data.email.htmlContent.match(/<b>([a-f0-9]{64})<\/b>/)[1]

  // Đặt lại mật khẩu mới
  const resetRes = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: resetToken, newPassword: "MatkhauMoi@123" }),
  })
  if (!resetRes.ok) {
    throw new Error("Đặt lại mật khẩu thất bại!")
  }
  console.log("-> Đặt lại mật khẩu thành công!")

  // Gửi lại access token cũ từ trước khi reset tới /api/auth/me -> Phải bị từ chối 401
  const reuseAccessAfterReset = await fetch(`${BASE_URL}/auth/me`, {
    headers: {
      Cookie: `cf_access_token=${accessBeforeReset}`,
    },
  })
  if (reuseAccessAfterReset.status === 401) {
    console.log("-> Access Token cũ bị từ chối sau khi Reset Mật khẩu: HTTP 401 Unauthorized (Toàn bộ phiên cũ đã thu hồi)!")
  } else {
    throw new Error(
      `LỖI BẢO MẬT: Access Token cũ vẫn dùng được sau Reset Mật khẩu! Status: ${reuseAccessAfterReset.status}`,
    )
  }

  console.log("\n=== TẤT CẢ 13 TIÊU CHÍ KIỂM THỬ TÍCH HỢP ĐÃ ĐẠT 100%! ===")
}

runIntegrationTests()
  .catch((err) => {
    console.error("❌ Kiểm thử thất bại:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
