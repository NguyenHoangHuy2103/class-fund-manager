import { useState } from 'react'
import { Logo } from '../components/Shell'
import { Button, Field, Icon, Input, useBusy } from '../components/ui'
import { ROLE_LABEL, type Role } from '../lib/data'
import { isEmail } from '../lib/format'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'

export default function Login() {
  const { s, a } = useStore()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [errs, setErrs] = useState<{ email?: string; pw?: string; form?: string }>({})
  const { busy, run } = useBusy()

  const enter = (id: string) => {
    a.login(id)
    navigate('/', true)
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const er: typeof errs = {}
    if (!email.trim()) er.email = 'Vui lòng nhập email'
    else if (!isEmail(email)) er.email = 'Email chưa đúng định dạng, ví dụ: ten@lopse1902.edu.vn'
    if (!pw) er.pw = 'Vui lòng nhập mật khẩu'
    setErrs(er)
    if (er.email || er.pw) return
    run(() => {
      const m = s.members.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.status === 'active')
      if (!m) return setErrs({ form: 'Không tìm thấy tài khoản demo này. Hãy dùng một trong các email mẫu bên dưới hoặc chọn một vai trò để trải nghiệm.' })
      enter(m.id)
    }, 600)
  }
  const roleLogin = (role: Role) => {
    run(() => {
      const pool = s.members.filter((m) => m.role === role && m.status === 'active')
      enter(((role === 'member' && pool.find((m) => m.id === 'm4')) || pool[0]).id)
    }, 350)
  }
  const demo: { role: Role; label: string; email: string }[] = (['admin', 'treasurer', 'member'] as Role[]).map((role) => {
    const m = (role === 'member' && s.members.find((x) => x.id === 'm4')) || s.members.find((x) => x.role === role)!
    return { role, label: ROLE_LABEL[role], email: m.email }
  })

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="bg-hero relative flex min-h-[280px] flex-col justify-between overflow-hidden p-6 text-white sm:p-10 lg:min-h-dvh lg:p-14">
        <div className="absolute inset-0 bg-gradient-to-br from-ink/75 via-ink/50 to-ink/25" aria-hidden />
        <svg className="absolute -right-24 -top-16 hidden w-[520px] opacity-40 sm:block" viewBox="0 0 400 400" fill="none" aria-hidden>
          <circle cx="200" cy="200" r="190" stroke="#CEE6FB" strokeWidth="1.2" />
          <circle cx="200" cy="200" r="140" stroke="#CEE6FB" strokeWidth="1.2" />
          <circle cx="200" cy="200" r="90" stroke="#CEE6FB" strokeWidth="1.2" />
          <circle cx="330" cy="110" r="14" fill="#CEE6FB" />
          <circle cx="90" cy="260" r="8" fill="#8BBCF2" />
        </svg>
        <div className="relative"><Logo light /></div>
        <div className="relative max-w-lg py-10">
          <h1 className="text-[34px] font-extrabold leading-[1.15] tracking-tight sm:text-5xl">Quỹ lớp rõ ràng, cả lớp an tâm.</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-white/90">Mọi khoản thu, khoản chi và minh chứng chuyển khoản đều công khai, dễ kiểm tra và có nhật ký đi kèm.</p>
          <ul className="mt-8 hidden gap-3 sm:grid">
            {['Theo dõi ai đã đóng, ai còn thiếu theo từng đợt', 'Gửi minh chứng chuyển khoản chỉ với vài thao tác', 'Sổ thu–chi minh bạch, xuất báo cáo CSV'].map((t) => (
              <li key={t} className="flex items-center gap-3 text-[15px] font-medium">
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-white/20"><Icon name="check" size={16} /></span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative hidden text-sm text-white/80 sm:block">Lớp SE1902 · Bản demo, không kết nối ngân hàng thật</p>
      </section>

      <section className="flex items-center justify-center bg-white px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <h2 className="text-[28px] font-extrabold tracking-tight">Đăng nhập</h2>
          <p className="mt-1 text-[15px] text-subtle">Chào mừng quay lại. Đây là bản demo nên không cần thông tin thật.</p>

          <form onSubmit={submit} noValidate className="mt-7 space-y-4">
            {errs.form && <div role="alert" className="flex items-start gap-2 rounded-xl bg-bad-bg p-3 text-sm font-medium text-bad"><Icon name="alert" size={18} className="mt-0.5" />{errs.form}</div>}
            <Field label="Email" error={errs.email}>
              {(p) => <Input {...p} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errs.email} placeholder="ten@lopse1902.edu.vn" />}
            </Field>
            <Field label="Mật khẩu" error={errs.pw}>
              {(p) => (
                <div className="relative">
                  <Input {...p} type={show ? 'text' : 'password'} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} invalid={!!errs.pw} className="pr-12" />
                  <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={show} className="absolute right-1 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-subtle hover:bg-tint">
                    <Icon name={show ? 'eyeoff' : 'eye'} size={20} />
                  </button>
                </div>
              )}
            </Field>
            <Button type="submit" variant="primary" className="w-full" loading={busy}>Đăng nhập</Button>
          </form>

          <div className="my-7 flex items-center gap-3 text-sm text-subtle"><span className="h-px flex-1 bg-line" />hoặc trải nghiệm nhanh<span className="h-px flex-1 bg-line" /></div>

          <div className="grid gap-2.5">
            {demo.map((d) => (
              <button key={d.role} disabled={busy} onClick={() => roleLogin(d.role)} className="group flex min-h-14 items-center gap-3 rounded-xl border border-line px-4 text-left transition-all hover:border-brand hover:bg-tint disabled:opacity-60">
                <span className="inline-flex size-9 items-center justify-center rounded-lg bg-tint text-brand-ink"><Icon name={d.role === 'admin' ? 'settings' : d.role === 'treasurer' ? 'wallet' : 'user'} size={19} /></span>
                <span className="flex-1">
                  <span className="block text-[15px] font-bold">Trải nghiệm với vai trò {d.role === 'admin' ? 'Quản trị' : d.label}</span>
                  <span className="block text-sm text-subtle">{d.email}</span>
                </span>
                <Icon name="chevr" size={18} className="text-subtle transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
          <p className="mt-5 flex items-start gap-2 rounded-xl bg-canvas p-3 text-sm text-subtle">
            <Icon name="info" size={18} className="mt-0.5 shrink-0 text-brand-ink" />
            Tài khoản demo: dùng một trong các email ở trên với mật khẩu bất kỳ. Đăng nhập chỉ mô phỏng, không phải bảo mật thật.
          </p>
        </div>
      </section>
    </div>
  )
}
