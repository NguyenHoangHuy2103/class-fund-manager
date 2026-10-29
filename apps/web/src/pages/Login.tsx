import { useState } from "react"
import { Logo } from "../components/Shell"
import { Button, Field, Icon, Input, useBusy } from "../components/ui"
import { useStore } from "../lib/store"
import { navigate } from "../lib/router"

export default function Login() {
  const { login } = useStore()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { busy, run } = useBusy()

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!email.trim()) return setError("Vui lòng nhập email đăng nhập")
    if (!password) return setError("Vui lòng nhập mật khẩu")

    setError(null)
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

  const quickLogin = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword("Matkhau@123")
    setError(null)
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
      label: "Lớp trưởng (Admin)",
      email: "admin@lopse1902.edu.vn",
      role: "Quản trị viên",
    },
    {
      label: "Thủ quỹ (Admin)",
      email: "thuquy@lopse1902.edu.vn",
      role: "Quản trị viên",
    },
    {
      label: "Lê Hoàng Anh",
      email: "anh.lh@lopse1902.edu.vn",
      role: "Thành viên",
    },
    {
      label: "Phạm Thu Hà",
      email: "ha.pt@lopse1902.edu.vn",
      role: "Thành viên",
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
            Hệ thống quản lý thu chi và đóng quỹ lớp học cơ bản, công khai số dư
            và lịch sử thu chi cho toàn bộ thành viên.
          </p>

          <ul className="mt-8 hidden gap-3 sm:grid text-[15px] font-medium">
            <li className="flex items-center gap-3">
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-white/20">
                <Icon name="check" size={15} />
              </span>
              Theo dõi ai đã đóng, ai chưa đóng cho từng đợt thu
            </li>
            <li className="flex items-center gap-3">
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-white/20">
                <Icon name="check" size={15} />
              </span>
              Sổ quỹ thu chi rõ ràng, kiểm soát chặt chẽ số dư
            </li>
            <li className="flex items-center gap-3">
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-white/20">
                <Icon name="check" size={15} />
              </span>
              Bảo mật phiên bằng HttpOnly Cookie & chống trùng lặp
            </li>
          </ul>
        </div>

        <p className="relative hidden text-sm text-white/80 sm:block">
          Dự án Quản lý Quỹ Lớp (Class Fund Manager) · Phiên bản MVP
        </p>
      </section>

      {/* Login Form Right */}
      <section className="flex items-center justify-center bg-white px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <h2 className="text-[26px] font-extrabold tracking-tight sm:text-[28px]">
            Đăng nhập
          </h2>
          <p className="mt-1 text-[15px] text-subtle">
            Nhập tài khoản để truy cập hệ thống quỹ lớp.
          </p>

          <form onSubmit={handleLogin} noValidate className="mt-6 space-y-4">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-bad-bg p-3 text-sm font-medium text-bad"
              >
                <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Field label="Email đăng nhập">
              {(p) => (
                <Input
                  {...p}
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ten@lopse1902.edu.vn"
                  disabled={busy}
                />
              )}
            </Field>

            <Field label="Mật khẩu">
              {(p) => (
                <div className="relative">
                  <Input
                    {...p}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-12"
                    disabled={busy}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="absolute right-1 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-subtle hover:bg-tint"
                  >
                    <Icon name={showPassword ? "eyeoff" : "eye"} size={20} />
                  </button>
                </div>
              )}
            </Field>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={busy}
            >
              Đăng nhập
            </Button>
          </form>

          {/* Quick Demo Login */}
          <div className="my-6 flex items-center gap-3 text-sm text-subtle">
            <span className="h-px flex-1 bg-line" />
            <span>hoặc chọn tài khoản demo local</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="grid gap-2">
            {demoAccounts.map((d) => (
              <button
                key={d.email}
                type="button"
                disabled={busy}
                onClick={() => quickLogin(d.email)}
                className="group flex min-h-12 items-center gap-3 rounded-xl border border-line px-3.5 py-2 text-left transition-all hover:border-brand hover:bg-tint disabled:opacity-50"
              >
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-tint text-brand-ink">
                  <Icon
                    name={d.role === "Quản trị viên" ? "wallet" : "user"}
                    size={18}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold text-ink">
                    {d.label}
                  </span>
                  <span className="block truncate text-xs text-subtle">
                    {d.email}
                  </span>
                </span>
                <span className="text-xs font-semibold text-brand-ink opacity-0 transition-opacity group-hover:opacity-100">
                  Đăng nhập →
                </span>
              </button>
            ))}
          </div>

          <p className="mt-5 text-xs text-subtle text-center">
            Mật khẩu demo chung: <b className="text-ink">Matkhau@123</b>
          </p>
        </div>
      </section>
    </div>
  )
}
