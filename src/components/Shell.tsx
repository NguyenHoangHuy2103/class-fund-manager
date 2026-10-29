import { useEffect, useState, type ReactNode } from 'react'
import { ROLE_LABEL, type Role } from '../lib/data'
import { vnd } from '../lib/format'
import { navigate, useRoute } from '../lib/router'
import { collectionOf, dueInfo, nameOf, openCollections, pendingCount, standing } from '../lib/selectors'
import { useStore } from '../lib/store'
import { Avatar, Badge, Button, ConfirmDialog, cx, Icon, Modal, Popover, MenuItem, PageSkeleton, useToast } from './ui'

const ALL: Role[] = ['admin', 'treasurer', 'member']
export const NAV = [
  { path: '', label: 'Tổng quan', icon: 'home', roles: ALL },
  { path: 'members', label: 'Thành viên', icon: 'users', roles: ['admin'] as Role[] },
  { path: 'collections', label: 'Đợt thu quỹ', icon: 'wallet', roles: ALL },
  { path: 'mine', label: 'Khoản đóng của tôi', icon: 'receipt', roles: ALL },
  { path: 'approvals', label: 'Xác nhận đóng tiền', icon: 'checkcircle', roles: ['treasurer'] as Role[] },
  { path: 'ledger', label: 'Sổ thu–chi', icon: 'book', roles: ALL },
  { path: 'reports', label: 'Báo cáo', icon: 'chart', roles: ['admin', 'treasurer'] as Role[] },
  { path: 'logs', label: 'Nhật ký hoạt động', icon: 'history', roles: ['admin'] as Role[] },
  { path: 'settings', label: 'Cài đặt lớp', icon: 'settings', roles: ['admin'] as Role[] },
]
const href = (p: string) => '/' + p

function Logo({ light }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="bg-hero relative inline-flex size-10 items-center justify-center overflow-hidden rounded-xl text-white after:absolute after:inset-0 after:bg-ink/35">
        <Icon name="wallet" size={22} className="relative z-10" />
      </span>
      <span className={cx('text-xl font-extrabold tracking-tight', light ? 'text-white' : 'text-ink')}>Quỹ Lớp</span>
    </div>
  )
}
export { Logo }

function useNotifs() {
  const { s, user, role } = useStore()
  const list: { id: string; text: string; sub: string; icon: string; tone: string; link: string }[] = []
  if (!user) return list
  if (role === 'treasurer')
    s.submissions.filter((x) => x.status === 'pending').forEach((x) => list.push({ id: 'p:' + x.id, text: `${nameOf(s, x.memberId)} gửi minh chứng ${vnd(x.amount)}`, sub: collectionOf(s, x.collectionId)?.name ?? '', icon: 'clock', tone: 'text-brand-ink bg-tint', link: '/approvals?s=' + x.id }))
  s.submissions.filter((x) => x.memberId === user.id && (x.status === 'approved' || x.status === 'rejected')).forEach((x) =>
    list.push({ id: `r:${x.id}:${x.status}`, text: x.status === 'approved' ? `Minh chứng ${vnd(x.amount)} đã được xác nhận` : `Minh chứng ${vnd(x.amount)} bị từ chối`, sub: collectionOf(s, x.collectionId)?.name ?? '', icon: x.status === 'approved' ? 'checkcircle' : 'alert', tone: x.status === 'approved' ? 'text-ok bg-ok-bg' : 'text-bad bg-bad-bg', link: '/mine' }),
  )
  openCollections(s).filter((c) => c.memberIds.includes(user.id)).forEach((c) => {
    const st = standing(s, c, user.id)
    const d = dueInfo(c.due, c.status)
    if (st.canSubmit > 0 && d.tone !== 'neutral') list.push({ id: 'd:' + c.id, text: `${d.label}: còn ${vnd(st.remaining)} cho đợt thu`, sub: c.name, icon: 'calendar', tone: 'text-warn bg-warn-bg', link: '/mine' })
  })
  if (role === 'admin') s.logs.slice(0, 4).forEach((l) => list.push({ id: 'l:' + l.id, text: `${nameOf(s, l.actorId)}: ${l.action}`, sub: l.target, icon: 'history', tone: 'text-brand-ink bg-tint', link: l.link?.split('?')[0] === '/approvals' ? '/logs' : l.link || '/logs' }))
  return list.slice(0, 8)
}

function Bell() {
  const { s, a } = useStore()
  const list = useNotifs()
  const unread = list.filter((n) => !s.notifRead.includes(n.id))
  return (
    <Popover width="w-[360px]" trigger={(p) => (
      <button {...p} aria-label={`Thông báo${unread.length ? `, ${unread.length} chưa đọc` : ''}`} className="relative inline-flex size-11 items-center justify-center rounded-xl text-deep transition-colors hover:bg-tint">
        <Icon name="bell" />
        {unread.length > 0 && <span className="absolute right-1.5 top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-bad px-1 text-[11px] font-bold leading-5 text-white">{unread.length}</span>}
      </button>
    )}>
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-3 py-2">
            <h3 className="font-bold">Thông báo</h3>
            <button disabled={!unread.length} onClick={() => a.markRead(list.map((n) => n.id))} className="rounded-md px-1 text-sm font-semibold text-brand-ink hover:underline disabled:text-subtle disabled:no-underline">Đánh dấu đã đọc</button>
          </div>
          <ul className="max-h-[60dvh] overflow-y-auto">
            {list.length === 0 && <li className="px-3 py-8 text-center text-[15px] text-subtle">Bạn không có thông báo nào.</li>}
            {list.map((n) => {
              const read = s.notifRead.includes(n.id)
              return (
                <li key={n.id}>
                  <button onClick={() => { a.markRead([n.id]); close(); navigate(n.link) }} className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-tint">
                    <span className={cx('mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl', n.tone)}><Icon name={n.icon} size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className={cx('block text-[15px] leading-snug', read ? 'text-subtle' : 'font-semibold text-ink')}>{n.text}</span>
                      <span className="block truncate text-sm text-subtle">{n.sub}</span>
                    </span>
                    {!read && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand" aria-label="Chưa đọc" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Popover>
  )
}

function useAccountActions() {
  const { a } = useStore()
  const [confirmReset, setConfirmReset] = useState(false)
  const toast = useToast()
  const dialog = confirmReset ? (
    <ConfirmDialog title="Đặt lại dữ liệu demo?" tone="danger" confirmLabel="Đặt lại demo" onClose={() => setConfirmReset(false)}
      message="Toàn bộ thay đổi bạn đã thực hiện (đợt thu, minh chứng, giao dịch, nhật ký…) sẽ bị xóa và dữ liệu mẫu ban đầu được khôi phục."
      onConfirm={() => { a.reset(); setConfirmReset(false); navigate('/', true); toast('success', 'Đã khôi phục dữ liệu demo ban đầu.') }} />
  ) : null
  return { askReset: () => setConfirmReset(true), dialog, logout: () => { a.logout(); navigate('/', true) } }
}

function AccountMenu({ up, compact }: { up?: boolean; compact?: boolean }) {
  const { user, role } = useStore()
  const { askReset, dialog, logout } = useAccountActions()
  if (!user) return null
  return (
    <>
      <Popover up={up} align={up ? 'left' : 'right'} width="w-64" trigger={(p) => compact ? (
        <button {...p} aria-label="Menu tài khoản" className="rounded-full transition-shadow hover:ring-2 hover:ring-sky"><Avatar name={user.name} size={40} /></button>
      ) : (
        <button {...p} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-white/10">
          <Avatar name={user.name} size={40} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-white">{user.name}</span>
            <span className="block truncate text-sm text-mist">{ROLE_LABEL[role]}</span>
          </span>
          <Icon name="dots" className="text-mist" />
        </button>
      )}>
        {(close) => (
          <div>
            <div className="px-3 py-2">
              <p className="font-bold text-ink">{user.name}</p>
              <p className="text-sm text-subtle">{user.email}</p>
              <Badge tone="info" className="mt-2">{ROLE_LABEL[role]}</Badge>
            </div>
            <div className="my-1 border-t border-line" />
            <MenuItem icon="receipt" onClick={() => { close(); navigate('/mine') }}>Khoản đóng của tôi</MenuItem>
            <MenuItem icon="refresh" onClick={() => { close(); askReset() }}>Đặt lại demo</MenuItem>
            <MenuItem icon="logout" danger onClick={() => { close(); logout() }}>Đăng xuất</MenuItem>
          </div>
        )}
      </Popover>
      {dialog}
    </>
  )
}

const TITLES: Record<string, string> = { '': 'Tổng quan', members: 'Thành viên', collections: 'Đợt thu quỹ', mine: 'Khoản đóng của tôi', approvals: 'Xác nhận đóng tiền', ledger: 'Sổ thu–chi', reports: 'Báo cáo', logs: 'Nhật ký hoạt động', settings: 'Cài đặt lớp' }

export function Shell({ children }: { children: (page: string) => ReactNode }) {
  const { s, a, user, role } = useStore()
  const r = useRoute()
  const toast = useToast()
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const { askReset, dialog, logout } = useAccountActions()
  const items = NAV.filter((n) => n.roles.includes(role))
  const allowed = items.some((n) => n.path === r.page)
  const pending = pendingCount(s)

  useEffect(() => {
    setLoading(true)
    window.scrollTo(0, 0)
    const t = setTimeout(() => setLoading(false), 260)
    return () => clearTimeout(t)
  }, [r.page, r.id])
  useEffect(() => {
    if (!allowed && r.page in TITLES) {
      toast('info', `Trang “${TITLES[r.page]}” không dành cho vai trò ${ROLE_LABEL[role]}. Đã chuyển về Tổng quan.`)
      navigate('/', true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, r.page])

  const detailName = r.page === 'collections' && r.id ? collectionOf(s, r.id)?.name : undefined
  const roleAvail = ALL.filter((x) => s.members.some((m) => m.role === x && m.status === 'active'))
  const bottom = [
    { path: '', label: 'Tổng quan', icon: 'home' },
    { path: 'mine', label: 'Khoản đóng', icon: 'receipt' },
    { path: 'ledger', label: 'Sổ quỹ', icon: 'book' },
  ]
  const rest = items.filter((n) => !bottom.some((b) => b.path === n.path))
  const moreActive = more || rest.some((n) => n.path === r.page)

  const roleSelect = (
    <label className="flex items-center gap-2 rounded-xl border border-line bg-white pl-3 text-sm font-semibold text-subtle">
      <Icon name="user" size={16} className="hidden sm:block" />
      <span className="hidden xl:inline">Vai trò demo</span>
      <select aria-label="Vai trò demo" value={role} onChange={(e) => { a.switchRole(e.target.value as Role); toast('info', `Đang xem với vai trò ${ROLE_LABEL[e.target.value as Role]}`) }} className="min-h-11 cursor-pointer rounded-xl bg-transparent py-0 pl-1 pr-2 text-[15px] font-bold text-brand-ink focus:outline-none sm:pl-0">
        {roleAvail.map((x) => <option key={x} value={x}>{ROLE_LABEL[x]}</option>)}
      </select>
    </label>
  )

  return (
    <div className="min-h-dvh lg:pl-[272px]">
      <aside className="bg-hero fixed inset-y-0 left-0 z-20 hidden w-[272px] lg:block">
        <div className="absolute inset-0 bg-ink/55" />
        <div className="relative flex h-full flex-col p-4">
          <div className="px-2 py-3"><Logo light /></div>
          <nav aria-label="Điều hướng chính" className="mt-4 flex-1 space-y-1 overflow-y-auto">
            {items.map((n) => {
              const active = r.page === n.path
              return (
                <a key={n.path} href={'#' + href(n.path)} aria-current={active ? 'page' : undefined} className={cx('flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors', active ? 'bg-white text-ink shadow-sm' : 'text-white/90 hover:bg-white/12')}>
                  <Icon name={n.icon} size={20} className={active ? 'text-brand-ink' : ''} />
                  <span className="flex-1">{n.label}</span>
                  {n.path === 'approvals' && pending > 0 && <span className={cx('inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-[13px] font-bold leading-6', active ? 'bg-brand text-white' : 'bg-white text-deep')} aria-label={`${pending} hồ sơ chờ xử lý`}>{pending}</span>}
                </a>
              )
            })}
          </nav>
          <div className="border-t border-white/15 pt-3"><AccountMenu up /></div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="flex min-h-16 items-center gap-2 px-4 sm:gap-3 lg:px-8">
          <div className="min-w-0 flex-1">
            {detailName ? (
              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[15px]">
                <a href="#/collections" className="font-semibold text-brand-ink hover:underline">Đợt thu quỹ</a>
                <Icon name="chevr" size={16} className="text-subtle" />
                <span className="truncate font-bold text-ink">{detailName}</span>
              </nav>
            ) : (
              <p className="truncate text-[17px] font-bold text-ink">{TITLES[r.page] ?? 'Quỹ Lớp'}</p>
            )}
          </div>
          <Badge tone="warn" icon="info" className="hidden md:inline-flex">Dữ liệu demo</Badge>
          <Button size="sm" variant="ghost" icon="refresh" onClick={askReset} className="hidden md:inline-flex">Đặt lại demo</Button>
          {roleSelect}
          <Bell />
          <div className="hidden lg:block"><AccountMenu compact /></div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
        {loading || !allowed ? <PageSkeleton /> : <div className="anim-fade">{children(r.page)}</div>}
      </main>

      <nav aria-label="Điều hướng di động" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {bottom.map((n) => {
          const active = r.page === n.path
          return (
            <a key={n.path} href={'#' + href(n.path)} aria-current={active ? 'page' : undefined} className={cx('relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[13px] font-semibold', active ? 'text-brand-ink' : 'text-subtle')}>
              {active && <span className="absolute inset-x-6 top-0 h-0.5 rounded-b bg-brand" />}
              <Icon name={n.icon} size={22} />
              {n.label}
            </a>
          )
        })}
        <button onClick={() => setMore(true)} aria-haspopup="dialog" className={cx('relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[13px] font-semibold', moreActive ? 'text-brand-ink' : 'text-subtle')}>
          {moreActive && <span className="absolute inset-x-6 top-0 h-0.5 rounded-b bg-brand" />}
          <span className="relative">
            <Icon name="menu" size={22} />
            {pending > 0 && role === 'treasurer' && <span className="absolute -right-2 -top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-bad px-1 text-[11px] font-bold leading-4 text-white">{pending}</span>}
          </span>
          Thêm
        </button>
      </nav>

      {more && (
        <Modal title="Thêm" subtitle={user ? `${user.name} · ${ROLE_LABEL[role]}` : undefined} onClose={() => setMore(false)}>
          <ul className="-mx-2 space-y-1">
            {rest.map((n) => (
              <li key={n.path}>
                <button onClick={() => { setMore(false); navigate(href(n.path)) }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[16px] font-semibold hover:bg-tint">
                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-tint text-brand-ink"><Icon name={n.icon} size={19} /></span>
                  <span className="flex-1">{n.label}</span>
                  {n.path === 'approvals' && pending > 0 && <Badge tone="danger">{pending}</Badge>}
                  <Icon name="chevr" size={18} className="text-subtle" />
                </button>
              </li>
            ))}
            {rest.length === 0 && <li className="px-3 py-2 text-subtle">Không có mục nào khác.</li>}
          </ul>
          <div className="mt-4 space-y-2 border-t border-line pt-4">
            <Badge tone="warn" icon="info">Dữ liệu demo</Badge>
            <Button className="w-full" icon="refresh" onClick={() => { setMore(false); askReset() }}>Đặt lại demo</Button>
            <Button className="w-full" variant="soft" icon="logout" onClick={() => { setMore(false); logout() }}>Đăng xuất</Button>
          </div>
        </Modal>
      )}
      {dialog}
    </div>
  )
}
