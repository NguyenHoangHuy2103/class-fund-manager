import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { groupDigits, initials } from '../lib/format'
import type { Attachment } from '../lib/data'
import type { Standing } from '../lib/selectors'

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

/* ---------- Icons ---------- */
const P: Record<string, ReactNode> = {
  home: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><circle cx="17" cy="9" r="2.4" /><path d="M17 14.5c2.4 0 4 1.7 4 4.5" /></>,
  wallet: <><path d="M4 7a2 2 0 012-2h11v4" /><path d="M4 7v10a2 2 0 002 2h13a1 1 0 001-1V10a1 1 0 00-1-1H6a2 2 0 01-2-2z" /><circle cx="16.5" cy="14" r="1" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  checkcircle: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></>,
  book: <><path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z" /><path d="M5 17a3 3 0 013-3h11" /></>,
  chart: <><path d="M4 20V4M4 20h16" /><path d="M8 16v-5M12 16V8M16 16v-8" /></>,
  history: <><path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.4" /><path d="M3 4v4h4M12 8v4l3 2" /></>,
  settings: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
  bell: <><path d="M6 16v-5a6 6 0 1112 0v5l1.5 2h-15z" /><path d="M10 21h4" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeoff: <><path d="M3 3l18 18" /><path d="M10.6 6.1A9.8 9.8 0 0112 6c6.4 0 10 6 10 6a17 17 0 01-3.2 3.9M6.5 7.6A17 17 0 002 12s3.6 6 10 6c1.5 0 2.9-.3 4.1-.8" /><path d="M9.9 10a3 3 0 004.1 4.1" /></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" /></>,
  chevd: <path d="M6 9l6 6 6-6" />,
  chevr: <path d="M9 6l6 6-6 6" />,
  logout: <><path d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4" /><path d="M16 8l4 4-4 4M20 12H9" /></>,
  dots: <><circle cx="5" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="19" cy="12" r="1.4" fill="currentColor" /></>,
  arrowup: <path d="M12 19V5M6 11l6-6 6 6" />,
  arrowdown: <path d="M12 5v14M6 13l6 6 6-6" />,
  file: <><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></>,
  download: <><path d="M12 4v12M7 11l5 5 5-5" /><path d="M4 20h16" /></>,
  ban: <><circle cx="12" cy="12" r="9" /><path d="M6 6l12 12" /></>,
  link: <><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 00-5.7 0l-3 3A4 4 0 0011 18.7l1-1" /></>,
  alert: <><path d="M12 3l10 18H2z" /><path d="M12 10v4M12 17.5v.01" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  refresh: <><path d="M20 11a8 8 0 00-14-4L4 9" /><path d="M4 4v5h5M4 13a8 8 0 0014 4l2-2M20 20v-5h-5" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 012-2h9" /></>,
  bank: <><path d="M3 10l9-6 9 6" /><path d="M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18" /></>,
  user: <><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c0-4 3.4-6 7.5-6s7.5 2 7.5 6" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.01" /></>,
  pencil: <path d="M4 20l1-4L16 5l3 3L8 19z" />,
  image: <><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="M5 18l5-5 4 4 2-2 3 3" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>,
  sparkle: <path d="M12 3l2.2 6.3L21 12l-6.8 2.7L12 21l-2.2-6.3L3 12l6.8-2.7z" />,
}
export function Icon({ name, size = 20, className }: { name: keyof typeof P | string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cx('shrink-0', className)}>
      {P[name]}
    </svg>
  )
}

/* ---------- Button ---------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'; size?: 'sm' | 'md'; loading?: boolean; icon?: string }
export function Button({ variant = 'secondary', size = 'md', loading, icon, children, className, disabled, ...rest }: BtnProps) {
  const v = {
    primary: 'bg-brand text-white hover:bg-[#3f6dd0] active:bg-[#3560bf] shadow-[0_1px_2px_rgba(42,56,98,.25)]',
    secondary: 'bg-white text-ink border border-line hover:bg-tint active:bg-mist/60',
    soft: 'bg-tint text-brand-ink hover:bg-mist/70 active:bg-mist',
    ghost: 'text-deep hover:bg-tint active:bg-mist/60',
    danger: 'bg-bad text-white hover:bg-[#a82222] active:bg-[#901c1c]',
  }[variant]
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx('inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed', size === 'sm' ? 'min-h-9 px-3 text-sm' : 'min-h-11 px-4 text-[15px]', v, className)}
    >
      {loading ? <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden /> : icon ? <Icon name={icon} size={18} /> : null}
      {children}
    </button>
  )
}
export function IconButton({ label, icon, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: string }) {
  return (
    <button {...rest} aria-label={label} title={label} className={cx('inline-flex size-11 items-center justify-center rounded-xl text-deep transition-colors hover:bg-tint active:bg-mist/60', className)}>
      <Icon name={icon} />
    </button>
  )
}

/* ---------- Badges ---------- */
type Tone = 'success' | 'warn' | 'danger' | 'info' | 'neutral'
const TONES: Record<Tone, string> = {
  success: 'bg-ok-bg text-ok',
  warn: 'bg-warn-bg text-warn',
  danger: 'bg-bad-bg text-bad',
  info: 'bg-tint text-brand-ink',
  neutral: 'bg-[#eceff5] text-[#3d4a5e]',
}
export function Badge({ tone = 'neutral', icon, children, className }: { tone?: Tone; icon?: string; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-semibold leading-none', TONES[tone], className)}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  )
}
const STANDING: Record<Standing, { label: string; tone: Tone; icon: string }> = {
  paid: { label: 'Đã đóng đủ', tone: 'success', icon: 'checkcircle' },
  partial: { label: 'Đóng một phần', tone: 'warn', icon: 'clock' },
  pending: { label: 'Chờ xác nhận', tone: 'info', icon: 'clock' },
  rejected: { label: 'Bị từ chối', tone: 'danger', icon: 'alert' },
  unpaid: { label: 'Chưa đóng', tone: 'neutral', icon: 'x' },
}
export const STANDING_LABEL = Object.fromEntries(Object.entries(STANDING).map(([k, v]) => [k, v.label])) as Record<Standing, string>
export function StandingBadge({ status }: { status: Standing }) {
  const x = STANDING[status]
  return <Badge tone={x.tone} icon={x.icon}>{x.label}</Badge>
}
export function SubBadge({ status }: { status: 'pending' | 'approved' | 'rejected' | 'cancelled' }) {
  const m = { pending: ['Chờ xác nhận', 'info', 'clock'], approved: ['Đã xác nhận', 'success', 'checkcircle'], rejected: ['Bị từ chối', 'danger', 'alert'], cancelled: ['Giao dịch đã hủy', 'neutral', 'ban'] } as const
  return <Badge tone={m[status][1]} icon={m[status][2]}>{m[status][0]}</Badge>
}

/* ---------- Avatar ---------- */
const AV = ['#cee6fb', '#dfe5fb', '#d4efe3', '#fde7d3', '#efe0f7', '#e1ecf9']
const AV_TEXT = ['#2a3862', '#2a3862', '#0e5c36', '#8a3f05', '#5b2f7a', '#2a3862']
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const i = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-full font-bold" style={{ width: size, height: size, background: AV[i], color: AV_TEXT[i], fontSize: size * 0.38 }}>
      {initials(name)}
    </span>
  )
}

/* ---------- Form ---------- */
const fieldCls = (invalid?: boolean) =>
  cx('w-full min-h-11 rounded-xl border bg-white px-3.5 text-[15px] text-ink transition-colors placeholder:text-[#8895a8] hover:border-sky focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:bg-canvas disabled:text-subtle', invalid ? 'border-bad' : 'border-[#cfd9ec]')

export function Field({ label, error, hint, required, children, className }: { label: string; error?: string; hint?: string; required?: boolean; children: (p: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode; className?: string }) {
  const id = useId()
  const msg = error ? id + '-e' : hint ? id + '-h' : undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {required && <span className="text-bad"> *</span>}
      </label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': msg })}
      {error ? (
        <p id={id + '-e'} role="alert" className="mt-1.5 flex items-start gap-1 text-sm font-medium text-bad">
          <Icon name="alert" size={16} className="mt-0.5" />
          {error}
        </p>
      ) : hint ? (
        <p id={id + '-h'} className="mt-1.5 text-sm text-subtle">{hint}</p>
      ) : null}
    </div>
  )
}
export function Input({ invalid, className, ...r }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...r} className={cx(fieldCls(invalid), className)} />
}
export function Select({ invalid, className, children, ...r }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select {...r} className={cx(fieldCls(invalid), 'appearance-none bg-no-repeat pr-9 bg-[length:16px] bg-[position:right_12px_center]', className)} style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23566579' stroke-width='1.8' stroke-linecap='round' viewBox='0 0 24 24'><path d='M6 9l6 6 6-6'/></svg>\")" }}>
      {children}
    </select>
  )
}
export function Textarea({ invalid, className, ...r }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea {...r} className={cx(fieldCls(invalid), 'min-h-24 py-2.5', className)} />
}
export function MoneyInput({ value, onChange, ...r }: { value: string; onChange: (v: string) => void; invalid?: boolean } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <div className="relative">
      <Input {...r} inputMode="numeric" value={groupDigits(value)} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} className="pr-9 tnum" />
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-subtle">₫</span>
    </div>
  )
}
export function SearchBox({ value, onChange, placeholder, label = 'Tìm kiếm' }: { value: string; onChange: (v: string) => void; placeholder: string; label?: string }) {
  return (
    <div className="relative min-w-0 flex-1 sm:max-w-xs">
      <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
      <input type="search" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cx(fieldCls(), 'pl-10')} />
    </div>
  )
}

/* ---------- Overlay stack (Escape / focus) ---------- */
const stack: symbol[] = []
function useOverlay(onClose: () => void, busy?: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const id = Symbol()
    stack.push(id)
    const prev = document.activeElement as HTMLElement | null
    const root = ref.current!
    const focusables = () => Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
    const first = root.querySelector<HTMLElement>('[data-autofocus]') ?? focusables().find((e) => !e.hasAttribute('data-close')) ?? root
    first.focus()
    const key = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return
      if (e.key === 'Escape' && !busy) {
        e.stopPropagation()
        closeRef.current()
      }
      if (e.key === 'Tab') {
        const f = focusables()
        if (!f.length) return
        const a = f[0], z = f[f.length - 1]
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
      }
    }
    document.addEventListener('keydown', key)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', key)
      stack.splice(stack.indexOf(id), 1)
      if (!stack.length) document.body.style.overflow = ''
      prev?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy])
  return ref
}

export function Modal({ title, subtitle, onClose, children, footer, size = 'md', busy }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg'; busy?: boolean }) {
  const ref = useOverlay(onClose, busy)
  const tid = useId()
  const w = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' }[size]
  return createPortal(
    <div className="anim-fade fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={tid} tabIndex={-1} className={cx('anim-sheet sm:anim-pop flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-[var(--shadow-pop)] outline-none sm:rounded-3xl', w)}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={tid} className="text-lg font-bold leading-snug text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-subtle">{subtitle}</p>}
          </div>
          <button data-close aria-label="Đóng" onClick={onClose} disabled={busy} className="-mr-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-subtle hover:bg-tint disabled:opacity-40">
            <Icon name="x" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-line bg-canvas/60 px-5 py-4 sm:flex-row sm:justify-end sm:rounded-b-3xl sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Drawer({ title, subtitle, onClose, children, footer }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const ref = useOverlay(onClose)
  const tid = useId()
  return createPortal(
    <div className="anim-fade fixed inset-0 z-40 flex justify-end bg-ink/45" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={tid} tabIndex={-1} className="anim-slide flex h-full w-full flex-col bg-white shadow-[var(--shadow-pop)] outline-none sm:max-w-[480px] sm:rounded-l-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={tid} className="text-lg font-bold leading-snug text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-subtle">{subtitle}</p>}
          </div>
          <button data-close aria-label="Đóng" onClick={onClose} className="-mr-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-subtle hover:bg-tint">
            <Icon name="x" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-line bg-canvas/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function useBusy() {
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const run = useCallback((fn: () => void, ms = 450) => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setTimeout(() => {
      try {
        fn()
      } finally {
        lock.current = false
        setBusy(false)
      }
    }, ms)
  }, [])
  return { busy, run }
}

export function ConfirmDialog({
  title, message, confirmLabel, tone = 'primary', onConfirm, onClose, reasonLabel, reasonRequired = true, children,
}: {
  title: string; message?: ReactNode; confirmLabel: string; tone?: 'primary' | 'danger'; onClose: () => void
  onConfirm: (reason: string) => string | void; reasonLabel?: string; reasonRequired?: boolean; children?: ReactNode
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const { busy, run } = useBusy()
  const submit = () => {
    if (reasonLabel && reasonRequired && reason.trim().length < 3) return setError('Vui lòng nhập lý do (ít nhất 3 ký tự)')
    setError('')
    run(() => {
      const r = onConfirm(reason.trim())
      if (typeof r === 'string') setError(r)
    })
  }
  return (
    <Modal title={title} size="sm" onClose={onClose} busy={busy}
      footer={<>
        <Button onClick={onClose} disabled={busy}>Hủy bỏ</Button>
        <Button variant={tone} onClick={submit} loading={busy}>{confirmLabel}</Button>
      </>}>
      <div className="space-y-4">
        {message && <div className="text-[15px] leading-relaxed text-[#2f3b4d]">{message}</div>}
        {children}
        {reasonLabel && (
          <Field label={reasonLabel} required={reasonRequired} error={error}>
            {(p) => <Textarea {...p} data-autofocus value={reason} onChange={(e) => setReason(e.target.value)} invalid={!!error} />}
          </Field>
        )}
        {!reasonLabel && error && <p role="alert" className="flex items-start gap-1 text-sm font-medium text-bad"><Icon name="alert" size={16} className="mt-0.5" />{error}</p>}
      </div>
    </Modal>
  )
}

/* ---------- Toast ---------- */
type ToastItem = { id: number; tone: 'success' | 'error' | 'info'; text: string; action?: { label: string; onClick: () => void } }
const ToastCtx = createContext<(tone: ToastItem['tone'], text: string, action?: ToastItem['action']) => void>(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<ToastItem[]>([])
  const push = useCallback((tone: ToastItem['tone'], text: string, action?: ToastItem['action']) => {
    const id = Date.now() + Math.random()
    setList((l) => [...l.slice(-2), { id, tone, text, action }])
    setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 5000)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {createPortal(
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
          {list.map((t) => (
            <div key={t.id} role="status" className="anim-pop pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl bg-ink px-4 py-3 text-[15px] font-medium text-white shadow-[var(--shadow-pop)]">
              <span className={cx('mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full', t.tone === 'success' ? 'bg-[#2fbf7a]' : t.tone === 'error' ? 'bg-[#f05a5a]' : 'bg-brand')}>
                <Icon name={t.tone === 'success' ? 'check' : t.tone === 'error' ? 'x' : 'info'} size={13} className="text-white" />
              </span>
              <span>{t.text}</span>
              {t.action && <button onClick={() => { t.action!.onClick(); setList((l) => l.filter((x) => x.id !== t.id)) }} className="ml-1 whitespace-nowrap rounded-md font-bold text-sky underline-offset-2 hover:underline">{t.action.label}</button>}
              <button aria-label="Đóng thông báo" className="-mr-1 ml-1 text-white/70 hover:text-white" onClick={() => setList((l) => l.filter((x) => x.id !== t.id))}>
                <Icon name="x" size={16} />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  )
}

/* ---------- Popover ---------- */
export function Popover({ trigger, children, align = 'right', width = 'w-72', up }: { up?: boolean; trigger: (p: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'true' }) => ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; width?: string }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open])
  return (
    <div ref={box} className="relative">
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'true' })}
      {open && (
        <div className={cx('anim-pop absolute z-30 max-w-[calc(100vw-24px)] rounded-2xl border border-line bg-white p-1.5 shadow-[var(--shadow-pop)]', width, up ? 'bottom-full mb-2' : 'top-full mt-2', align === 'right' ? 'right-0' : 'left-0')}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
export function MenuItem({ icon, children, onClick, danger }: { icon?: string; children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cx('flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium transition-colors hover:bg-tint', danger ? 'text-bad' : 'text-ink')}>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  )
}

/* ---------- Layout bits ---------- */
export function Card({ children, className, as: Tag = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' }) {
  return <Tag className={cx('rounded-[20px] border border-line bg-white shadow-card', className)}>{children}</Tag>
}
export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      {action}
    </div>
  )
}
export function Tabs<T extends string>({ items, value, onChange, label }: { items: { key: T; label: string; count?: number }[]; value: T; onChange: (k: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-[#e9effa] p-1">
      {items.map((i) => (
        <button key={i.key} role="tab" aria-selected={value === i.key} onClick={() => onChange(i.key)} className={cx('inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-xl px-4 text-[15px] font-semibold transition-all duration-150', value === i.key ? 'bg-white text-ink shadow-sm' : 'text-subtle hover:text-ink')}>
          {i.label}
          {i.count !== undefined && <span className={cx('rounded-full px-1.5 text-[13px]', value === i.key ? 'bg-tint text-brand-ink' : 'bg-white/70')}>{i.count}</span>}
        </button>
      ))}
    </div>
  )
}
export function Empty({ icon = 'file', title, text, action }: { icon?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-tint text-brand-ink"><Icon name={icon} size={26} /></span>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-[15px] text-subtle">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
export function Progress({ pct, tone = 'brand', label }: { pct: number; tone?: 'brand' | 'ok'; label?: string }) {
  return (
    <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'Tiến độ'} className="h-2 w-full overflow-hidden rounded-full bg-[#e3ebf8]">
      <div className={cx('h-full rounded-full transition-[width] duration-500', tone === 'ok' || pct >= 100 ? 'bg-[#1f9d63]' : 'bg-brand')} style={{ width: Math.min(100, pct) + '%' }} />
    </div>
  )
}
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton', className)} aria-hidden />
}
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải" className="space-y-5">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      <Skeleton className="h-72" />
    </div>
  )
}
export function PageHeader({ title, desc, actions }: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-[30px]">{title}</h1>
        {desc && <p className="mt-1 max-w-2xl text-[15px] text-subtle">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>
}
export function Stat({ label, value, sub, icon, tone = 'info', onClick }: { label: string; value: string; sub?: string; icon: string; tone?: 'info' | 'success' | 'warn' | 'danger'; onClick?: () => void }) {
  const t = { info: 'bg-tint text-brand-ink', success: 'bg-ok-bg text-ok', warn: 'bg-warn-bg text-warn', danger: 'bg-bad-bg text-bad' }[tone]
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-subtle">{label}</span>
        <span className={cx('inline-flex size-9 items-center justify-center rounded-xl', t)}><Icon name={icon} size={18} /></span>
      </div>
      <p className="tnum mt-3 text-2xl font-extrabold tracking-tight text-ink">{value}</p>
      {sub && <p className="mt-1 text-sm text-subtle">{sub}</p>}
    </>
  )
  const cls = 'rounded-[20px] border border-line bg-white p-5 text-left shadow-card'
  return onClick ? <button onClick={onClick} className={cx(cls, 'transition-all duration-150 hover:-translate-y-0.5 hover:border-sky hover:shadow-[0_8px_24px_rgba(79,126,225,.15)]')}>{inner}</button> : <div className={cls}>{inner}</div>
}

/* ---------- DataTable (card list on mobile) ---------- */
export interface Col<T> { key: string; header: string; cell: (r: T) => ReactNode; align?: 'right'; title?: boolean; className?: string; noMobileLabel?: boolean }
export function DataTable<T>({ cols, rows, rowKey, onRowClick, rowLabel }: { cols: Col<T>[]; rows: T[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void; rowLabel?: (r: T) => string }) {
  const act = (r: T) => (e: React.KeyboardEvent) => {
    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onRowClick?.(r)
    }
  }
  const title = cols.find((c) => c.title)
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-[15px]">
          <thead>
            <tr className="border-b border-line bg-canvas/70 text-[13px] font-bold uppercase tracking-wide text-subtle">
              {cols.map((c) => <th key={c.key} scope="col" className={cx('whitespace-nowrap px-4 py-3', c.align === 'right' && 'text-right')}>{c.header}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={rowKey(r)} tabIndex={onRowClick ? 0 : undefined} aria-label={rowLabel?.(r)} onClick={() => onRowClick?.(r)} onKeyDown={act(r)} className={cx('border-b border-line/70 last:border-0', onRowClick && 'cursor-pointer transition-colors hover:bg-tint/60 focus-visible:bg-tint/60')}>
                {cols.map((c) => <td key={c.key} className={cx('px-4 py-3.5 align-middle', c.align === 'right' && 'text-right', c.className)}>{c.cell(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-line md:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)} tabIndex={onRowClick ? 0 : undefined} aria-label={rowLabel?.(r)} onClick={() => onRowClick?.(r)} onKeyDown={act(r)} className={cx('space-y-2.5 px-4 py-4', onRowClick && 'cursor-pointer active:bg-tint/60')}>
            {title && <div className="font-semibold">{title.cell(r)}</div>}
            <dl className="space-y-1.5">
              {cols.filter((c) => !c.title).map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-3 text-[15px]">
                  {!c.noMobileLabel && <dt className="shrink-0 text-subtle">{c.header}</dt>}
                  <dd className={cx('min-w-0', c.noMobileLabel ? 'w-full' : 'text-right')}>{c.cell(r)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}

/* ---------- File pick ---------- */
function resize(file: File): Promise<Attachment> {
  return new Promise((res, rej) => {
    const fr = new FileReader()
    fr.onerror = () => rej()
    fr.onload = () => {
      const img = new Image()
      img.onerror = () => rej()
      img.onload = () => {
        const k = Math.min(1, 720 / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = img.width * k
        c.height = img.height * k
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        res({ name: file.name, url: c.toDataURL('image/jpeg', 0.75) })
      }
      img.src = fr.result as string
    }
    fr.readAsDataURL(file)
  })
}
export function FilePick({ value, onChange, sample, sampleLabel, error }: { value: Attachment | null; onChange: (a: Attachment | null) => void; sample: () => Attachment; sampleLabel: string; error?: string }) {
  const inp = useRef<HTMLInputElement>(null)
  const [err, setErr] = useState('')
  const pick = async (f?: File) => {
    if (!f) return
    if (!f.type.startsWith('image/')) return setErr('Chỉ nhận tệp ảnh (JPG, PNG, WebP).')
    try {
      setErr('')
      onChange(await resize(f))
    } catch {
      setErr('Không đọc được ảnh này. Hãy thử ảnh khác hoặc dùng ảnh mẫu.')
    }
  }
  return (
    <div>
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas p-3">
          <img src={value.url} alt="Xem trước ảnh đã chọn" className="size-16 rounded-lg border border-line bg-white object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{value.name}</p>
            <p className="text-sm text-subtle">Đã đính kèm</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => onChange(null)}>Bỏ ảnh</Button>
        </div>
      ) : (
        <div className={cx('flex flex-col items-stretch gap-2 rounded-xl border-2 border-dashed p-4 sm:flex-row', error || err ? 'border-bad' : 'border-[#cfd9ec]')}>
          <input ref={inp} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label="Chọn tệp ảnh" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
          <Button className="flex-1" icon="upload" onClick={() => inp.current?.click()}>Chọn ảnh từ máy</Button>
          <Button className="flex-1" variant="soft" icon="image" onClick={() => onChange(sample())}>{sampleLabel}</Button>
        </div>
      )}
      {(error || err) && <p role="alert" className="mt-1.5 flex items-start gap-1 text-sm font-medium text-bad"><Icon name="alert" size={16} className="mt-0.5" />{error || err}</p>}
    </div>
  )
}

export function KV({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-[15px]">
      <dt className="shrink-0 text-subtle">{label}</dt>
      <dd className="min-w-0 text-right font-semibold text-ink">{children}</dd>
    </div>
  )
}
export function LinkBtn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button onClick={onClick} className="inline-flex items-center gap-1 rounded-md font-semibold text-brand-ink underline-offset-2 hover:underline">{children}</button>
}
