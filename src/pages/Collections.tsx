import { useEffect, useMemo, useState } from 'react'
import { CashModal, PaymentHistory, SubmitProofModal } from '../components/forms'
import { Avatar, Badge, Button, Card, ConfirmDialog, DataTable, Empty, Field, Icon, Input, KV, Modal, MoneyInput, PageHeader, Progress, SearchBox, Select, StandingBadge, STANDING_LABEL, Tabs, Textarea, Toolbar, useBusy, useToast, type Col } from '../components/ui'
import { fmtDate, parseMoney, todayISO, vnd } from '../lib/format'
import { navigate, useRoute } from '../lib/router'
import { collectionOf, collectionStats, dueInfo, memberOf, nameOf, standing, type Standing } from '../lib/selectors'
import { useStore } from '../lib/store'
import type { Collection } from '../lib/data'

function CreateModal({ onClose }: { onClose: () => void }) {
  const { s, a } = useStore()
  const toast = useToast()
  const { busy, run } = useBusy()
  const active = s.members.filter((m) => m.status === 'active')
  const [f, setF] = useState({ name: '', purpose: '', amount: '', due: '' })
  const [sel, setSel] = useState<string[]>(active.map((m) => m.id))
  const [q, setQ] = useState('')
  const [er, setEr] = useState<Record<string, string>>({})
  const shown = active.filter((m) => `${m.name} ${m.code}`.toLowerCase().includes(q.trim().toLowerCase()))
  const toggle = (id: string) => setSel((x) => (x.includes(id) ? x.filter((i) => i !== id) : [...x, id]))

  const submit = () => {
    const e: Record<string, string> = {}
    const amount = parseMoney(f.amount)
    if (f.name.trim().length < 3) e.name = 'Vui lòng nhập tên đợt thu (ít nhất 3 ký tự)'
    if (!f.purpose.trim()) e.purpose = 'Vui lòng nhập mục đích thu'
    if (amount <= 0) e.amount = 'Số tiền mỗi người phải lớn hơn 0'
    if (!f.due) e.due = 'Vui lòng chọn hạn đóng'
    else if (f.due < todayISO()) e.due = 'Hạn đóng không được trước hôm nay'
    if (!sel.length) e.members = 'Hãy chọn ít nhất một thành viên áp dụng'
    setEr(e)
    if (Object.keys(e).length) return
    run(() => {
      const r = a.createCollection({ name: f.name, purpose: f.purpose, amount, due: f.due, memberIds: sel })
      if (r.ok) {
        toast('success', `Đã tạo đợt thu “${f.name.trim()}”.`, { label: 'Xem chi tiết', onClick: () => navigate('/collections/' + r.id) })
        onClose()
      } else setEr({ form: r.error })
    })
  }
  const total = parseMoney(f.amount) * sel.length
  return (
    <Modal title="Tạo đợt thu" subtitle="Thành viên được chọn sẽ thấy khoản này trong “Khoản đóng của tôi”." size="lg" onClose={onClose} busy={busy}
      footer={<><Button onClick={onClose} disabled={busy}>Hủy</Button><Button variant="primary" loading={busy} onClick={submit}>Tạo đợt thu</Button></>}>
      <div className="space-y-4">
        {er.form && <div role="alert" className="flex gap-2 rounded-xl bg-bad-bg p-3 text-sm font-medium text-bad"><Icon name="alert" size={18} />{er.form}</div>}
        <Field label="Tên đợt thu" required error={er.name}>{(p) => <Input {...p} data-autofocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} invalid={!!er.name} disabled={busy} />}</Field>
        <Field label="Mục đích" required error={er.purpose}>{(p) => <Textarea {...p} value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} invalid={!!er.purpose} className="min-h-20" disabled={busy} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Số tiền mỗi người" required error={er.amount}>{(p) => <MoneyInput {...p} value={f.amount} onChange={(v) => setF({ ...f, amount: v })} invalid={!!er.amount} disabled={busy} />}</Field>
          <Field label="Hạn đóng" required error={er.due}>{(p) => <Input {...p} type="date" min={todayISO()} value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} invalid={!!er.due} disabled={busy} />}</Field>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">Thành viên áp dụng <span className="text-bad">*</span> <span className="font-normal text-subtle">({sel.length}/{active.length} đã chọn)</span></legend>
          <div className={`rounded-xl border ${er.members ? 'border-bad' : 'border-[#cfd9ec]'}`}>
            <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center">
              <SearchBox value={q} onChange={setQ} placeholder="Tìm thành viên" label="Tìm thành viên áp dụng" />
              <div className="flex gap-2">
                <Button size="sm" variant="soft" onClick={() => setSel(Array.from(new Set([...sel, ...shown.map((m) => m.id)])))}>Chọn tất cả</Button>
                <Button size="sm" variant="ghost" onClick={() => setSel(sel.filter((id) => !shown.some((m) => m.id === id)))}>Bỏ chọn</Button>
              </div>
            </div>
            <ul className="max-h-60 overflow-y-auto p-1.5">
              {shown.length === 0 && <li className="px-3 py-6 text-center text-[15px] text-subtle">Không có thành viên phù hợp.</li>}
              {shown.map((m) => (
                <li key={m.id}>
                  <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 hover:bg-tint/70">
                    <input type="checkbox" className="size-5 accent-[#4f7ee1]" checked={sel.includes(m.id)} onChange={() => toggle(m.id)} />
                    <Avatar name={m.name} size={32} />
                    <span className="flex-1 text-[15px] font-medium">{m.name}</span>
                    <span className="tnum text-sm text-subtle">{m.code}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          {er.members && <p role="alert" className="mt-1.5 flex gap-1 text-sm font-medium text-bad"><Icon name="alert" size={16} className="mt-0.5" />{er.members}</p>}
        </fieldset>
        {total > 0 && <p className="rounded-xl bg-tint px-4 py-3 text-[15px]">Dự kiến thu: <b className="tnum">{vnd(total)}</b> từ {sel.length} thành viên.</p>}
      </div>
    </Modal>
  )
}

export function Collections() {
  const { s, role } = useStore()
  const r = useRoute()
  const [tab, setTab] = useState<'all' | 'open' | 'closed'>('all')
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  useEffect(() => {
    if (r.params.get('new') && role === 'treasurer') {
      setCreating(true)
      r.setParam('new')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const list = s.collections.filter((c) => (tab === 'all' || c.status === tab) && c.name.toLowerCase().includes(q.trim().toLowerCase()))
  const cols: Col<Collection>[] = [
    { key: 'n', header: 'Đợt thu', title: true, cell: (c) => <span><span className="block font-semibold">{c.name}</span><span className="block max-w-xs truncate text-sm font-normal text-subtle">{c.purpose}</span></span> },
    { key: 'd', header: 'Hạn đóng', cell: (c) => { const d = dueInfo(c.due, c.status); return <span className="flex flex-col items-start gap-1 md:items-start"><span className="tnum">{fmtDate(c.due)}</span><Badge tone={d.tone} icon={c.status === 'closed' ? 'checkcircle' : 'calendar'}>{d.label}</Badge></span> } },
    { key: 'a', header: 'Mức đóng', align: 'right', cell: (c) => <span className="tnum">{vnd(c.amount)}</span> },
    { key: 'c', header: 'Đã thu', align: 'right', cell: (c) => <b className="tnum text-ok">{vnd(collectionStats(s, c).collected)}</b> },
    { key: 'm', header: 'Còn thiếu', align: 'right', cell: (c) => <span className="tnum">{vnd(collectionStats(s, c).remaining)}</span> },
    { key: 'p', header: 'Tiến độ', cell: (c) => { const st = collectionStats(s, c); return <span className="block min-w-28"><span className="tnum mb-1 flex justify-between text-sm"><span>{st.full}/{st.total} người</span><b>{st.pct}%</b></span><Progress pct={st.pct} label={c.name} /></span> } },
    { key: 's', header: 'Trạng thái', cell: (c) => c.status === 'open' ? <Badge tone="info" icon="clock">Đang mở</Badge> : <Badge tone="neutral" icon="checkcircle">Đã đóng</Badge> },
  ]
  return (
    <>
      <PageHeader title="Đợt thu quỹ" desc="Theo dõi từng đợt thu, tiến độ đóng và số tiền còn thiếu." actions={role === 'treasurer' && <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Tạo đợt thu</Button>} />
      <Card>
        <Toolbar>
          <Tabs label="Trạng thái đợt thu" value={tab} onChange={setTab} items={[{ key: 'all', label: 'Tất cả', count: s.collections.length }, { key: 'open', label: 'Đang mở', count: s.collections.filter((c) => c.status === 'open').length }, { key: 'closed', label: 'Đã đóng', count: s.collections.filter((c) => c.status === 'closed').length }]} />
          <SearchBox value={q} onChange={setQ} placeholder="Tìm đợt thu" label="Tìm đợt thu" />
        </Toolbar>
        {list.length === 0 ? (
          <Empty icon="wallet" title={q ? 'Không tìm thấy đợt thu phù hợp' : 'Chưa có đợt thu nào ở mục này'} text={q ? 'Thử từ khóa khác.' : undefined} action={q ? <Button onClick={() => setQ('')}>Xóa tìm kiếm</Button> : role === 'treasurer' ? <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Tạo đợt thu</Button> : undefined} />
        ) : (
          <DataTable cols={cols} rows={list} rowKey={(c) => c.id} onRowClick={(c) => navigate('/collections/' + c.id)} rowLabel={(c) => `Mở chi tiết ${c.name}`} />
        )}
      </Card>
      {creating && <CreateModal onClose={() => setCreating(false)} />}
    </>
  )
}

export function CollectionDetail({ id }: { id: string }) {
  const { s, a, user, role } = useStore()
  const toast = useToast()
  const c = collectionOf(s, id)
  const [q, setQ] = useState('')
  const [fs, setFs] = useState<'all' | Standing>('all')
  const [cash, setCash] = useState<string | null>(null)
  const [proof, setProof] = useState(false)
  const [closing, setClosing] = useState(false)
  const rows = useMemo(() => (c ? c.memberIds.map((mid) => ({ m: memberOf(s, mid)!, st: standing(s, c, mid) })) : []), [s, c])
  if (!c) return <Empty icon="wallet" title="Không tìm thấy đợt thu" text="Đợt thu này không tồn tại hoặc đã bị xóa khỏi dữ liệu demo." action={<Button variant="primary" onClick={() => navigate('/collections')}>Về danh sách đợt thu</Button>} />
  const st = collectionStats(s, c)
  const d = dueInfo(c.due, c.status)
  const staff = role === 'treasurer'
  const canSeeAll = role !== 'member'
  const mine = user && rows.find((r) => r.m.id === user.id)
  const filtered = rows.filter((r) => (fs === 'all' || r.st.status === fs) && `${r.m.name} ${r.m.code}`.toLowerCase().includes(q.trim().toLowerCase()))
  const canCash = staff && c.status === 'open'

  const cols: Col<(typeof rows)[number]>[] = [
    { key: 'n', header: 'Thành viên', title: true, cell: (r) => <span className="flex items-center gap-3"><Avatar name={r.m.name} /><span><span className="block font-semibold">{r.m.name}</span><span className="block text-sm font-normal text-subtle">{r.m.code}</span></span></span> },
    { key: 'o', header: 'Phải đóng', align: 'right', cell: (r) => <span className="tnum">{vnd(r.st.owe)}</span> },
    { key: 'p', header: 'Đã đóng', align: 'right', cell: (r) => <b className="tnum text-ok">{vnd(r.st.paid)}</b> },
    { key: 'r', header: 'Còn thiếu', align: 'right', cell: (r) => <span className="tnum font-semibold">{vnd(r.st.remaining)}</span> },
    { key: 's', header: 'Trạng thái', cell: (r) => <StandingBadge status={r.st.status} /> },
    ...(canCash ? [{ key: 'a', header: '', align: 'right' as const, noMobileLabel: true, cell: (r: (typeof rows)[number]) => r.st.remaining > 0 ? <Button size="sm" variant="soft" icon="plus" onClick={() => setCash(r.m.id)}>Ghi nhận</Button> : <span className="text-sm text-subtle">—</span> }] : []),
  ]

  return (
    <>
      <PageHeader title={c.name} desc={c.purpose} actions={
        <>
          <Button onClick={() => navigate('/collections')} icon="chevr" className="[&>svg]:rotate-180">Danh sách</Button>
          {canCash && <Button icon="plus" variant="primary" onClick={() => setCash('')}>Ghi nhận tiền mặt</Button>}
          {staff && c.status === 'open' && <Button variant="secondary" icon="ban" onClick={() => setClosing(true)}>Đóng đợt thu</Button>}
        </>
      } />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-subtle">Đã thu / mục tiêu</p>
              <p className="tnum mt-1 text-3xl font-extrabold tracking-tight">{vnd(st.collected)} <span className="text-lg font-semibold text-subtle">/ {vnd(st.target)}</span></p>
            </div>
            {c.status === 'open' ? <Badge tone="info" icon="clock">Đang mở</Badge> : <Badge tone="neutral" icon="checkcircle">Đã đóng</Badge>}
          </div>
          <div className="mt-5"><Progress pct={st.pct} label="Tiến độ đợt thu" /></div>
          <div className="tnum mt-3 flex flex-wrap justify-between gap-2 text-[15px]"><span><b>{st.pct}%</b> hoàn thành</span><span>{st.full}/{st.total} đã đóng đủ · còn thiếu <b>{vnd(st.remaining)}</b></span></div>
          {st.pending > 0 && <p className="mt-4 flex items-center gap-2 rounded-xl bg-tint px-3.5 py-2.5 text-[15px] text-brand-ink"><Icon name="clock" size={18} />{st.pending} minh chứng đang chờ xác nhận (chưa tính vào số đã thu).</p>}
        </Card>
        <Card className="p-6">
          <dl className="divide-y divide-line">
            <KV label="Mức đóng">{vnd(c.amount)}/người</KV>
            <KV label="Hạn đóng">{fmtDate(c.due)}</KV>
            <KV label="Còn lại"><Badge tone={d.tone} icon={c.status === 'closed' ? 'checkcircle' : 'calendar'}>{d.label}</Badge></KV>
            <KV label="Áp dụng">{c.memberIds.length} thành viên</KV>
            <KV label="Người tạo">{nameOf(s, c.createdBy)}</KV>
            <KV label="Ngày tạo">{fmtDate(c.createdAt)}</KV>
          </dl>
        </Card>
      </div>

      {user && (role === 'member' || mine) && (
        <Card className="mt-5 p-6">
          <h2 className="mb-4 text-lg font-bold">Khoản của bạn</h2>
          {!mine ? <p className="text-[15px] text-subtle">Bạn không thuộc danh sách áp dụng của đợt thu này.</p> : (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="flex items-center justify-between"><StandingBadge status={mine.st.status} /><span className="tnum text-[15px] text-subtle">Phải đóng {vnd(mine.st.owe)}</span></div>
                <p className="tnum mt-3 text-3xl font-extrabold">{mine.st.remaining ? vnd(mine.st.remaining) : 'Đã đủ'}</p>
                <p className="text-sm text-subtle">{mine.st.remaining ? `còn thiếu · đã đóng ${vnd(mine.st.paid)}${mine.st.pending ? ` · chờ xác nhận ${vnd(mine.st.pending)}` : ''}` : 'Cảm ơn bạn đã đóng đủ'}</p>
                {mine.st.rejected && <p className="mt-3 rounded-xl bg-bad-bg px-3.5 py-3 text-[15px] text-bad"><b>Minh chứng bị từ chối:</b> {mine.st.rejected.rejectReason}</p>}
                {c.status === 'open' && mine.st.canSubmit > 0 && <Button className="mt-4" variant="primary" icon="upload" onClick={() => setProof(true)}>{mine.st.status === 'rejected' ? 'Gửi lại minh chứng' : 'Gửi minh chứng'}</Button>}
                {c.status === 'open' && mine.st.canSubmit === 0 && mine.st.pending > 0 && <p className="mt-4 text-[15px] text-subtle">Minh chứng của bạn đang chờ thủ quỹ xác nhận.</p>}
              </div>
              <div><h3 className="mb-2 font-bold">Lịch sử đóng</h3><PaymentHistory colId={c.id} memId={user.id} /></div>
            </div>
          )}
        </Card>
      )}

      {canSeeAll && (
        <Card className="mt-5">
          <Toolbar>
            <h2 className="mr-auto text-lg font-bold">Theo từng thành viên</h2>
            <SearchBox value={q} onChange={setQ} placeholder="Tìm tên hoặc mã SV" label="Tìm thành viên trong đợt thu" />
            <Select aria-label="Lọc theo trạng thái" value={fs} onChange={(e) => setFs(e.target.value as 'all' | Standing)} className="sm:w-48">
              <option value="all">Mọi trạng thái</option>
              {(Object.keys(STANDING_LABEL) as Standing[]).map((k) => <option key={k} value={k}>{STANDING_LABEL[k]}</option>)}
            </Select>
          </Toolbar>
          {filtered.length === 0 ? <Empty icon="search" title="Không có thành viên phù hợp" action={<Button onClick={() => { setQ(''); setFs('all') }}>Xóa bộ lọc</Button>} /> : <DataTable cols={cols} rows={filtered} rowKey={(r) => r.m.id} />}
        </Card>
      )}

      {cash !== null && <CashModal collectionId={c.id} memberId={cash || undefined} onClose={() => setCash(null)} />}
      {proof && user && <SubmitProofModal memberId={user.id} collectionId={c.id} onClose={() => setProof(false)} />}
      {closing && (
        <ConfirmDialog title="Đóng đợt thu này?" confirmLabel="Đóng đợt thu" onClose={() => setClosing(false)}
          message={<>Sau khi đóng, đợt thu <b>{c.name}</b> không nhận thêm minh chứng hay tiền mặt. {st.remaining > 0 ? <>Khoản còn thiếu <b>{vnd(st.remaining)}</b> sẽ không còn được tính vào “Còn phải thu”.</> : 'Tất cả thành viên đã đóng đủ.'}</>}
          onConfirm={() => { const res = a.closeCollection(c.id); if (!res.ok) return res.error; toast('success', `Đã đóng đợt thu “${c.name}”.`); setClosing(false) }} />
      )}
    </>
  )
}
