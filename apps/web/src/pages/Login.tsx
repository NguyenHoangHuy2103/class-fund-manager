import { useState } from "react"
import { Logo } from "../components/Shell"
import { Button, Field, Icon, Input, useBusy } from "../components/ui"
import { useStore } from "../lib/store"
import { api } from "../lib/api"
import { navigate } from "../lib/router"

export default function Login() {
  const { login } = useStore()
  const [tab, setTab] = useState<"login" | "register">("login")

  // Login state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Register state
  const [regFullName, setRegFullName] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regPassword, setRegPassword] = useState("")

  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const { busy, run } = useBusy()

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!email.trim()) return setError("Vui lòng nhập email đăng nhập")
    if (!password) return setError("Vui lòng nhập mật khẩu")

    setError(null)
    setSuccessMsg(null)
    run(async () => {
      try {
        await login(email.trim(), password)
        navigate("/", true)
      } catch (err: any) {
        setError(
          err.message || "Đăng nhập không thành công. Vui lòng kiểm tra lại.",
        )
      }
    })
  }

  const handleRegister = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!regFullName.trim()) return setError("Vui lòng nhập họ và tên của bạn")
    if (!regEmail.trim()) return setError("Vui lòng nhập email")
    if (regPassword.length < 6) return setError("Mật khẩu phải có ít nhất 6 ký tự")

    setError(null)
    setSuccessMsg(null)
    run(async () => {
      try {
        const res = await api.auth.register({
          fullName: regFullName.trim(),
          email: regEmail.trim(),
          password: regPassword,
        })
        setSuccessMsg(res.message || "Đăng ký thành công! Vui lòng đăng nhập.")
        setEmail(regEmail.trim())
        setPassword(regPassword)
        setTab("login")
      } catch (err: any) {
        setError(err.message || "Không thể đăng ký tài khoản. Vui lòng thử lại.")
      }
    })
  }

  const handleGoogleLogin = () => {
    run(async () => {
      try {
        const res = await api.auth.getGoogleUrl()
        if (res.data?.url) {
          window.location.href = res.data.url
        }
      } catch (err: any) {
        setError(err.message || "Google OAuth chưa được cấu hình. (Xem báo cáo GĐ1).")
      }
    })
  }

  const quickLogin = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword("Matkhau@123")
    setError(null)
    setSuccessMsg(null)
    run(async () => {
      try {
        await login(demoEmail, "Matkhau@123")
        navigate("/", true)
      } catch (err: any) {
        setError(
          err.message ||
            "Không thể đăng nhập tài khoản demo. Hãy chắc chắn backend đã được khởi động.",
        )
      }
    })
  }

  const demoAccounts = [
    {
      label: "Thủ quỹ lớp",
      email: "thuquy@lopse1902.edu.vn",
      desc: "Quản lý lớp, duyệt thành viên",
    },
    {
      label: "Thành viên (ACTIVE)",
      email: "anh.lh@lopse1902.edu.vn",
      desc: "Thành viên lớp chính thức",
    },
    {
      label: "Thành viên (PENDING)",
      email: "pending@lopse1902.edu.vn",
      desc: "Đang chờ duyệt vào lớp",
    },
    {
      label: "Super Admin",
      email: "superadmin@classfund.local",
      desc: "Quản trị viên toàn hệ thống",
    },
  ]

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Banner Left */}
      <section className="bg-hero relative flex min-h-[280px] flex-col justify-between overflow-hidden p-6 text-white sm:p-10 lg:min-h-dvh lg:p-14">
        <div
          className="absolute inset-0 bg-gradient-to-br from-ink/80 via-ink/55 to-ink/30"
          aria-hidden
        />
        <div className="relative">
          <Logo light />
        </div>

        <div className="relative max-w-lg py-10">
          <h1 className="text-[32px] font-extrabold leading-[1.2] tracking-tight sm:text-5xl">
            Quỹ lớp minh bạch, quản lý dễ dàng.
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-white/90">
            Hệ thống quản lý thu chi và quỹ lớp học trực quan, phân quyền chặt chẽ giữa Thủ quỹ và Thành viên, bảo đảm số liệu tiền mặt và ngân hàng luôn chính xác.
          </p>

          <ul className="mt-8 hidden gap-3 sm:grid text-[15px] font-medium">
            <li className="flex items-center gap-3">
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-white/20">
                <Icon name="check" size={15} />
              </span>
              Tách biệt 2 nguồn quỹ: Tiền mặt và Tài khoản ngân hàng
            </li>
            <li className="flex items-center gap-3">
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-white/20">
                <Icon name="check" size={15} />
              </span>
              Đóng quỹ qua mã VietQR và gửi biên lai chuyển khoản
            </li>
            <li className="flex items-center gap-3">
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-white/20">
                <Icon name="check" size={15} />
              </span>
              Sổ quỹ minh bạch, công khai chứng từ và lịch sử kiểm toán
            </li>
          </ul>
        </div>

        <div className="relative text-xs text-white/70">
          Class Fund Manager • Hệ thống quản lý quỹ lớp học
        </div>
      </section>

      {/* Form Right */}
      <section className="flex flex-col justify-center bg-canvas p-6 sm:p-12 lg:p-16">
        <div className="mx-auto w-full max-w-md">
          {/* Tabs Đăng nhập / Đăng ký */}
          <div className="mb-6 flex rounded-xl border border-line bg-sand/30 p-1">
            <button
              type="button"
              onClick={() => {
                setTab("login")
                setError(null)
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                tab === "login"
                  ? "bg-white text-ink shadow-sm"
                  : "text-subtle hover:text-ink"
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("register")
                setError(null)
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                tab === "register"
                  ? "bg-white text-ink shadow-sm"
                  : "text-subtle hover:text-ink"
              }`}
            >
              Đăng ký tài khoản
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              {tab === "login" ? "Chào mừng trở lại!" : "Tạo tài khoản mới"}
            </h2>
            <p className="mt-1 text-sm text-subtle">
              {tab === "login"
                ? "Đăng nhập để vào không gian quản lý quỹ của lớp bạn."
                : "Tạo tài khoản trước, sau đó tạo lớp hoặc tham gia lớp bằng mã mời."}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-bad/30 bg-bad-bg p-3 text-sm text-bad">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 rounded-xl border border-ok/30 bg-ok-bg p-3 text-sm text-ok">
              {successMsg}
            </div>
          )}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Địa chỉ email" required>
                {(p) => (
                  <Input
                    {...p}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    autoComplete="email"
                    disabled={busy}
                  />
                )}
              </Field>

              <Field label="Mật khẩu" required>
                {(p) => (
                  <div className="relative">
                    <Input
                      {...p}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={busy}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-ink"
                    >
                      <Icon name={showPassword ? "eyeoff" : "eye"} size={18} />
                    </button>
                  </div>
                )}
              </Field>

              <Button
                type="submit"
                variant="primary"
                loading={busy}
                className="w-full"
              >
                Đăng nhập
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <Field label="Họ và tên" required>
                {(p) => (
                  <Input
                    {...p}
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    disabled={busy}
                  />
                )}
              </Field>

              <Field label="Địa chỉ email" required>
                {(p) => (
                  <Input
                    {...p}
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="student@school.edu.vn"
                    disabled={busy}
                  />
                )}
              </Field>

              <Field label="Mật khẩu (ít nhất 6 ký tự)" required>
                {(p) => (
                  <Input
                    {...p}
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={busy}
                  />
                )}
              </Field>

              <Button
                type="submit"
                variant="primary"
                loading={busy}
                className="w-full"
              >
                Đăng ký tài khoản
              </Button>
            </form>
          )}

          {/* Nút Đăng nhập Google */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white py-2.5 text-sm font-semibold text-ink transition hover:bg-sand/40"
            >
              <svg className="size-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Tiếp tục với Google</span>
            </button>
          </div>

          {/* Quick Demo Login */}
          <div className="mt-8 border-t border-line pt-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-subtle">
              Tài khoản dùng thử (Seed Data Local):
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => quickLogin(acc.email)}
                  disabled={busy}
                  className="rounded-xl border border-line bg-white p-2.5 text-left transition hover:border-sky hover:bg-tint/30"
                >
                  <p className="text-xs font-bold text-ink">{acc.label}</p>
                  <p className="text-[11px] text-subtle truncate">{acc.email}</p>
                  <p className="text-[10px] text-brand">{acc.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
