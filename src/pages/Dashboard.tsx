import { useMemo, useState } from 'react'
import { FlowChart } from '../components/charts'
import { Badge, Button, Card, cx, Empty, Icon, Progress, SectionTitle, Stat, Tabs } from '../components/ui'
import { addDays, fmtDate, shortName, todayISO, vnd } from '../lib/format'
import { navigate } from '../lib/router'
import { balance, collectionStats, dueInfo, openCollections, outstanding, pendingAmount, pendingCount, progressOverall, standing, totals, weeklyBuckets } from '../lib/selectors'
import { useStore } from '../lib/store'

type Range = 'month' | '30d' | 'all'

export function TxRow({ t, onClick }: { t: import('../lib/data').Transaction; onClick: () => void }) {
  const inc = t.type === 'income'
  const dead = t.status === 'cancelled'
  return (
    <li>
      <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-tint/70">
        <span className={cx('inline-flex size-10 shrink-0 items-center justify-center rounded-xl', dead ? 'bg-[#eceff5] text-subtle' : inc ? 'bg-ok-bg text-ok' : 'bg-bad-bg text-bad')}><Icon name={inc ? 'arrowdown' : 'arrowup'} size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className={cx('block truncate text-[15px] font-semibold', dead && 'text-subtle line-through')}>{t.desc}</span>
          <span className="block text-sm text-subtle">{fmtDate(t.date)} · {t.category}{dead && ' · Đã hủy'}</span>
        </span>
        <span className={cx('tnum shrink-0 text-[15px] font-bold', dead ? 'text-subtle line-through' : inc ? 'text-ok' : 'text-bad')}>{inc ? '+' : '−'}{vnd(t.amount)}</span>
      </button>
    </li>
  )
}

export default function Dashboard() {
  const { s, user, role } = useStore()
  const [range, setRange] = useState<Range>('all')
  const today = todayISO()
  const from = range === 'month' ? today.slice(0, 8) + '01' : range === '30d' ? addDays(today, -29) : s.settings.openingDate
  const tot = totals(s, from, today)
  const buckets = useMemo(() => weeklyBuckets(s, from, today), [s, from, today])
  const bal = balance(s)
  const prog = progressOverall(s)
  const open = openCollections(s)
  const mineLeft = user ? open.filter((c) => c.memberIds.includes(user.id)).reduce((a, c) => a + standing(s, c, user.id).remaining, 0) : 0
  const recent = [...s.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id, undefined, { numeric: true })).slice(0, 6)
  const hour = new Date().getHours()
  const hello = hour < 11 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'
  const pend = pendingCount(s)
  const pct = prog.total ? (prog.full / prog.total) * 100 : 0
  const C = 2 * Math.PI * 52

  const actions =
    role === 'treasurer'
      ? [['Tạo đợt thu', 'plus', '/collections?new=1'], ['Ghi khoản chi', 'arrowup', '/ledger?new=expense'], [`Xác nhận đóng tiền${pend ? ` (${pend})` : ''}`, 'checkcircle', '/approvals']]
      : role === 'admin'
        ? [['Thêm thành viên', 'plus', '/members?new=1'], ['Xem báo cáo', 'chart', '/reports'], ['Nhật ký hoạt động', 'history', '/logs']]
        : [['Gửi minh chứng', 'upload', '/mine?submit=1'], ['Khoản đóng của tôi', 'receipt', '/mine'], ['Xem sổ thu–chi', 'book', '/ledger']]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-subtle">Lớp {s.settings.className} · Hôm nay {fmtDate(today)}</p>
        <Tabs label="Khoảng thời gian" value={range} onChange={setRange} items={[{ key: 'month', label: 'Tháng này' }, { key: '30d', label: '30 ngày' }, { key: 'all', label: 'Toàn kỳ' }]} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section aria-label="Số dư quỹ" className="bg-hero relative overflow-hidden rounded-[22px] p-6 text-white shadow-card sm:p-8 lg:col-span-2">
          <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-ink/45 to-ink/10" aria-hidden />
          <svg className="absolute -right-10 -top-10 w-72 opacity-50" viewBox="0 0 200 200" fill="none" aria-hidden><circle cx="100" cy="100" r="95" stroke="#fff" strokeOpacity=".5" /><circle cx="100" cy="100" r="62" stroke="#fff" strokeOpacity=".5" /><circle cx="100" cy="100" r="30" stroke="#fff" strokeOpacity=".5" /></svg>
          <div className="relative">
            <p className="text-[17px] font-medium text-white/95">{hello}, <b className="font-bold">{shortName(user?.name ?? '')}</b></p>
            <p className="mt-0.5 text-sm text-white/85">Quỹ lớp {s.settings.className} đang minh bạch với {s.members.filter((m) => m.status === 'active').length} thành viên.</p>
            <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-white/85">Số dư quỹ hiện tại</p>
            <p className="tnum mt-1 text-[40px] font-extrabold leading-none tracking-tight sm:text-[52px]" aria-label={`Số dư ${vnd(bal)}`}>{vnd(bal)}</p>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/90">
              <span className="inline-flex items-center gap-1.5"><Icon name="clock" size={16} />Chờ xác nhận: <b className="tnum">{vnd(pendingAmount(s))}</b> (chưa tính vào số dư)</span>
            </p>
            {mineLeft > 0 && (
              <button onClick={() => navigate('/mine')} className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white/15 px-3 text-sm font-semibold hover:bg-white/25">
                Bạn còn phải đóng {vnd(mineLeft)} <Icon name="chevr" size={16} />
              </button>
            )}
            <div className="mt-6 flex flex-wrap gap-2.5">
              {actions.map(([label, icon, to], i) => (
                <button key={label} onClick={() => navigate(to)} className={cx('inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-[15px] font-semibold transition-colors', i === 0 ? 'bg-white text-ink hover:bg-mist' : 'border border-white/40 bg-white/10 text-white hover:bg-white/20')}>
                  <Icon name={icon} size={18} />{label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <Card className="flex flex-col p-6">
          <h2 className="text-lg font-bold">Tiến độ đóng quỹ</h2>
          <p className="text-sm text-subtle">Thành viên đã đóng đủ các đợt đang mở</p>
          <div className="my-4 flex items-center gap-5">
            <svg width="128" height="128" viewBox="0 0 128 128" role="img" aria-label={`${prog.full} trên ${prog.total} thành viên đã đóng đủ`}>
              <circle cx="64" cy="64" r="52" fill="none" stroke="#e3ebf8" strokeWidth="12" />
              <circle cx="64" cy="64" r="52" fill="none" stroke="#4f7ee1" strokeWidth="12" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} transform="rotate(-90 64 64)" style={{ transition: 'stroke-dashoffset .6s' }} />
              <text x="64" y="62" textAnchor="middle" fontSize="28" fontWeight="800" fill="#0c161d">{prog.full}/{prog.total}</text>
              <text x="64" y="82" textAnchor="middle" fontSize="12" fill="#566579">người</text>
            </svg>
            <div>
              <p className="tnum text-3xl font-extrabold">{Math.round(pct)}%</p>
              <p className="text-sm text-subtle">đã đóng đủ</p>
            </div>
          </div>
          <Progress pct={pct} label="Tiến độ đóng quỹ toàn lớp" />
          <Button className="mt-auto w-full" variant="soft" onClick={() => navigate('/collections')} >Xem các đợt thu</Button>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Tổng thu" value={vnd(tot.income)} sub={range === 'all' ? 'Toàn kỳ, chỉ tính giao dịch hợp lệ' : range === 'month' ? 'Trong tháng này' : '30 ngày gần nhất'} icon="arrowdown" tone="success" onClick={() => navigate('/ledger?tab=income')} />
        <Stat label="Tổng chi" value={vnd(tot.expense)} sub={range === 'all' ? 'Toàn kỳ, chỉ tính giao dịch hợp lệ' : range === 'month' ? 'Trong tháng này' : '30 ngày gần nhất'} icon="arrowup" tone="danger" onClick={() => navigate('/ledger?tab=expense')} />
        <Stat label="Còn phải thu" value={vnd(outstanding(s))} sub={`Từ ${open.length} đợt thu đang mở`} icon="clock" tone="warn" onClick={() => navigate('/collections')} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 sm:p-6 lg:col-span-2">
          <SectionTitle title="Thu – chi theo tuần" />
          {buckets.some((b) => b.income || b.expense) ? <FlowChart data={buckets} /> : <Empty icon="chart" title="Chưa có giao dịch trong khoảng này" text="Chọn “Toàn kỳ” để xem toàn bộ dữ liệu." action={<Button onClick={() => setRange('all')}>Xem toàn kỳ</Button>} />}
        </Card>
        <Card className="p-5 sm:p-6">
          <SectionTitle title="Đợt thu đang mở" action={<button onClick={() => navigate('/collections')} className="text-sm font-semibold text-brand-ink hover:underline">Tất cả</button>} />
          {open.length === 0 ? <Empty icon="wallet" title="Chưa có đợt thu nào đang mở" action={role === 'treasurer' ? <Button variant="primary" icon="plus" onClick={() => navigate('/collections?new=1')}>Tạo đợt thu</Button> : undefined} /> : (
            <ul className="space-y-3">
              {open.map((c) => {
                const st = collectionStats(s, c)
                const d = dueInfo(c.due, c.status)
                return (
                  <li key={c.id}>
                    <button onClick={() => navigate('/collections/' + c.id)} className="w-full rounded-2xl border border-line p-4 text-left transition-colors hover:border-sky hover:bg-tint/50">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold leading-snug">{c.name}</p>
                        <Badge tone={d.tone === 'neutral' ? 'info' : d.tone} icon="calendar">{d.label}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-subtle">Hạn {fmtDate(c.due)} · {vnd(c.amount)}/người</p>
                      <div className="mt-3"><Progress pct={st.pct} label={c.name} /></div>
                      <p className="tnum mt-2 flex justify-between text-sm"><span>{st.full}/{st.total} đã đóng đủ</span><b>{st.pct}%</b></p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <SectionTitle title="Giao dịch gần đây" action={<button onClick={() => navigate('/ledger')} className="text-sm font-semibold text-brand-ink hover:underline">Xem sổ thu–chi</button>} />
        <ul className="-mx-2 divide-y divide-line/70">{recent.map((t) => <TxRow key={t.id} t={t} onClick={() => navigate('/ledger?tx=' + t.id)} />)}</ul>
      </Card>
    </div>
  )
}

