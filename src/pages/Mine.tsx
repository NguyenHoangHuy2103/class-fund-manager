import { useEffect, useState } from 'react'
import { PaymentHistory, SubmitProofModal } from '../components/forms'
import { Badge, Button, Card, Empty, Progress, StandingBadge, cx } from '../components/ui'
import { fmtDate, vnd } from '../lib/format'
import { navigate, useRoute } from '../lib/router'
import { dueInfo, standing } from '../lib/selectors'
import { useStore } from '../lib/store'

export default function Mine() {
  const { s, user } = useStore()
  const r = useRoute()
  const [proof, setProof] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  useEffect(() => {
    if (r.params.get('submit')) {
      setProof('')
      r.setParam('submit')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (!user) return null
  const rows = s.collections.filter((c) => c.memberIds.includes(user.id)).map((c) => ({ c, st: standing(s, c, user.id) }))
    .sort((a, b) => Number(a.c.status === 'closed') - Number(b.c.status === 'closed') || a.c.due.localeCompare(b.c.due))
  const open = rows.filter((x) => x.c.status === 'open')
  const left = open.reduce((a, x) => a + x.st.remaining, 0)
  const wait = open.reduce((a, x) => a + x.st.pending, 0)
  const paid = rows.reduce((a, x) => a + x.st.paid, 0)
  const canSend = open.some((x) => x.st.canSubmit > 0)

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-[28px] font-extrabold tracking-tight">Khoản đóng của tôi</h1><p className="mt-1 text-[15px] text-subtle">Các khoản bạn cần đóng và lịch sử xác nhận.</p></div>
        <Button variant="primary" icon="upload" disabled={!canSend} onClick={() => setProof('')}>Gửi minh chứng</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-sm font-semibold text-subtle">Còn phải đóng</p><p className="tnum mt-1 text-3xl font-extrabold">{vnd(left)}</p><p className="mt-1 text-sm text-subtle">{open.filter((x) => x.st.remaining > 0).length} khoản đang mở</p></Card>
        <Card className="p-5"><p className="text-sm font-semibold text-subtle">Chờ xác nhận</p><p className="tnum mt-1 text-3xl font-extrabold">{vnd(wait)}</p><p className="mt-1 text-sm text-subtle">Chưa tính vào số đã đóng</p></Card>
        <Card className="p-5"><p className="text-sm font-semibold text-subtle">Đã đóng (đã xác nhận)</p><p className="tnum mt-1 text-3xl font-extrabold text-ok">{vnd(paid)}</p><p className="mt-1 text-sm text-subtle">Tất cả các đợt</p></Card>
      </div>
      <div className="mt-6 space-y-4">
        {rows.length === 0 && <Card><Empty icon="wallet" title="Bạn chưa thuộc đợt thu nào" text="Khi thủ quỹ thêm bạn vào một đợt thu, khoản đóng sẽ hiện ở đây." /></Card>}
        {rows.map(({ c, st }) => {
          const d = dueInfo(c.due, c.status)
          const exp = openId === c.id
          return (
            <Card key={c.id} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <button onClick={() => navigate('/collections/' + c.id)} className="text-left text-lg font-bold hover:text-brand-ink hover:underline">{c.name}</button>
                  <p className="mt-0.5 text-sm text-subtle">Hạn {fmtDate(c.due)} · {vnd(c.amount)}</p>
                </div>
                <div className="flex flex-wrap gap-2"><StandingBadge status={st.status} />{c.status === 'closed' ? <Badge tone="neutral" icon="checkcircle">Đã đóng đợt</Badge> : <Badge tone={d.tone} icon="calendar">{d.label}</Badge>}</div>
              </div>
              <div className="mt-4"><Progress tone={st.status === 'paid' ? 'ok' : 'brand'} pct={Math.min(100, (st.paid / st.owe) * 100)} label={`Đã đóng ${c.name}`} /></div>
              <p className="tnum mt-2 flex flex-wrap justify-between gap-2 text-[15px]"><span>Đã đóng <b>{vnd(st.paid)}</b> / {vnd(st.owe)}</span><span>Còn thiếu <b>{vnd(st.remaining)}</b></span></p>
              {st.rejected && <div role="alert" className="mt-4 rounded-xl bg-bad-bg px-4 py-3 text-[15px] text-bad"><b>Minh chứng bị từ chối:</b> {st.rejected.rejectReason}</div>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {c.status === 'open' && st.canSubmit > 0 && <Button variant={st.status === 'rejected' ? 'primary' : 'soft'} icon="upload" onClick={() => setProof(c.id)}>{st.status === 'rejected' ? 'Gửi lại minh chứng' : 'Gửi minh chứng'}</Button>}
                {st.pending > 0 && <span className="text-[15px] text-subtle">Đang chờ thủ quỹ xác nhận {vnd(st.pending)}.</span>}
                <Button variant="ghost" className="ml-auto" aria-expanded={exp} onClick={() => setOpenId(exp ? null : c.id)}>Lịch sử đóng <span className={cx('inline-block transition-transform', exp && 'rotate-90')}>›</span></Button>
              </div>
              {exp && <div className="mt-4 border-t border-line pt-4"><PaymentHistory colId={c.id} memId={user.id} /></div>}
            </Card>
          )
        })}
      </div>
      {proof !== null && <SubmitProofModal memberId={user.id} collectionId={proof || undefined} onClose={() => setProof(null)} />}
    </>
  )
}
