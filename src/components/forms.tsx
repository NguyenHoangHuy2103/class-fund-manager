import { useMemo, useState } from 'react'
import { sampleImage, type Attachment } from '../lib/data'
import { fmtDate, fmtDateTime, parseMoney, shortName, todayISO, vnd } from '../lib/format'
import { memberOf, openCollections, standing } from '../lib/selectors'
import { useStore } from '../lib/store'
import { Button, Field, Icon, Input, FilePick, Modal, MoneyInput, Select, SubBadge, Textarea, useBusy, useToast } from './ui'

export function BankInfo() {
  const { s } = useStore()
  const toast = useToast()
  const st = s.settings
  const copy = () => {
    navigator.clipboard?.writeText(st.accountNo).then(
      () => toast('success', 'Đã sao chép số tài khoản mẫu.'),
      () => toast('error', 'Không sao chép được. Hãy chọn và sao chép thủ công.'),
    )
  }
  return (
    <div className="flex items-center gap-3 rounded-xl bg-tint p-3.5">
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-ink"><Icon name="bank" /></span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-ink">{st.bankName} · <span className="tnum">{st.accountNo}</span></p>
        <p className="text-subtle">Chủ TK: {st.accountHolder} · Thông tin mẫu</p>
      </div>
      <Button size="sm" variant="secondary" icon="copy" onClick={copy} aria-label="Sao chép số tài khoản">Sao chép</Button>
    </div>
  )
}

export function SubmitProofModal({ memberId, collectionId, onClose }: { memberId: string; collectionId?: string; onClose: () => void }) {
  const { s, a } = useStore()
  const toast = useToast()
  const { busy, run } = useBusy()
  const member = memberOf(s, memberId)!
  const options = useMemo(
    () => openCollections(s).filter((c) => c.memberIds.includes(memberId)).map((c) => ({ c, st: standing(s, c, memberId) })).filter((o) => o.st.canSubmit > 0 || o.c.id === collectionId),
    [s, memberId, collectionId],
  )
  const initial = options.find((o) => o.c.id === collectionId) ?? options[0]
  const [col, setCol] = useState(initial?.c.id ?? '')
  const [amount, setAmount] = useState(String(initial?.st.canSubmit ?? ''))
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [img, setImg] = useState<Attachment | null>(null)
  const [er, setEr] = useState<Record<string, string>>({})
  const cur = options.find((o) => o.c.id === col)
  const max = cur?.st.canSubmit ?? 0

  const submit = () => {
    const e: Record<string, string> = {}
    const v = parseMoney(amount)
    if (!cur) e.col = 'Vui lòng chọn đợt thu'
    if (v <= 0) e.amount = 'Số tiền phải lớn hơn 0'
    else if (v > max) e.amount = `Số tiền vượt quá khoản còn thiếu (${vnd(max)})`
    if (!date) e.date = 'Vui lòng chọn ngày chuyển'
    else if (date > todayISO()) e.date = 'Ngày chuyển không được ở tương lai'
    if (!img) e.img = 'Vui lòng chọn ảnh minh chứng hoặc dùng ảnh mẫu'
    setEr(e)
    if (Object.keys(e).length) return
    run(() => {
      const r = a.submitProof({ collectionId: col, memberId, amount: v, transferDate: date, note: note.trim(), image: img })
      if (r.ok) {
        toast('success', 'Đã gửi minh chứng. Khoản đóng chuyển sang “Chờ xác nhận”.')
        onClose()
      } else setEr({ form: r.error })
    })
  }

  return (
    <Modal title="Gửi minh chứng chuyển khoản" subtitle={`Người gửi: ${member.name}`} onClose={onClose} busy={busy}
      footer={options.length ? <><Button onClick={onClose} disabled={busy}>Hủy</Button><Button variant="primary" loading={busy} onClick={submit}>Gửi minh chứng</Button></> : <Button onClick={onClose}>Đóng</Button>}>
      {options.length === 0 ? (
        <div className="py-6 text-center">
          <span className="mx-auto mb-3 inline-flex size-14 items-center justify-center rounded-2xl bg-ok-bg text-ok"><Icon name="checkcircle" size={26} /></span>
          <p className="font-bold">Bạn không còn khoản nào cần đóng</p>
          <p className="mt-1 text-[15px] text-subtle">Tất cả đợt thu đang mở đã đóng đủ hoặc đang chờ xác nhận.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <BankInfo />
          {er.form && <div role="alert" className="flex gap-2 rounded-xl bg-bad-bg p-3 text-sm font-medium text-bad"><Icon name="alert" size={18} />{er.form}</div>}
          <Field label="Đợt thu" required error={er.col}>
            {(p) => (
              <Select {...p} value={col} onChange={(e) => { setCol(e.target.value); setAmount(String(options.find((o) => o.c.id === e.target.value)?.st.canSubmit ?? '')) }}>
                {options.map((o) => <option key={o.c.id} value={o.c.id}>{o.c.name}</option>)}
              </Select>
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Số tiền đã chuyển" required error={er.amount} hint={cur ? `Còn thiếu tối đa ${vnd(max)}` : undefined}>
              {(p) => <MoneyInput {...p} value={amount} onChange={setAmount} invalid={!!er.amount} />}
            </Field>
            <Field label="Ngày chuyển" required error={er.date}>
              {(p) => <Input {...p} type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} invalid={!!er.date} />}
            </Field>
          </div>
          <Field label="Ghi chú" hint="Không bắt buộc">
            {(p) => <Textarea {...p} value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20" />}
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-semibold">Ảnh minh chứng <span className="text-bad">*</span></p>
            <FilePick value={img} onChange={setImg} error={er.img} sampleLabel="Dùng ảnh mẫu" sample={() => sampleImage('transfer', parseMoney(amount) || max, member.name, date)} />
          </div>
        </div>
      )}
    </Modal>
  )
}

export function CashModal({ collectionId, memberId, onClose }: { collectionId: string; memberId?: string; onClose: () => void }) {
  const { s, a } = useStore()
  const toast = useToast()
  const { busy, run } = useBusy()
  const c = s.collections.find((x) => x.id === collectionId)!
  const rows = c.memberIds.map((id) => ({ m: memberOf(s, id)!, st: standing(s, c, id) })).filter((r) => r.st.remaining > 0)
  const first = rows.find((r) => r.m.id === memberId) ?? rows[0]
  const [mem, setMem] = useState(first?.m.id ?? '')
  const [amount, setAmount] = useState(String(first?.st.remaining ?? ''))
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [er, setEr] = useState<Record<string, string>>({})
  const cur = rows.find((r) => r.m.id === mem)
  const max = cur?.st.remaining ?? 0

  const submit = () => {
    const e: Record<string, string> = {}
    const v = parseMoney(amount)
    if (!cur) e.mem = 'Vui lòng chọn thành viên'
    if (v <= 0) e.amount = 'Số tiền phải lớn hơn 0'
    else if (v > max) e.amount = `Số tiền vượt quá khoản còn thiếu (${vnd(max)})`
    if (!date) e.date = 'Vui lòng chọn ngày nhận'
    else if (date > todayISO()) e.date = 'Ngày nhận không được ở tương lai'
    setEr(e)
    if (Object.keys(e).length) return
    run(() => {
      const r = a.recordCash({ collectionId, memberId: mem, amount: v, date, note: note.trim() })
      if (r.ok) {
        toast('success', `Đã ghi nhận ${vnd(v)} tiền mặt từ ${cur!.m.name} (${r.code}).`)
        onClose()
      } else setEr({ form: r.error })
    })
  }
  return (
    <Modal title="Ghi nhận tiền mặt" subtitle={c.name} onClose={onClose} busy={busy}
      footer={rows.length ? <><Button onClick={onClose} disabled={busy}>Hủy</Button><Button variant="primary" loading={busy} onClick={submit}>Ghi nhận</Button></> : <Button onClick={onClose}>Đóng</Button>}>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-[15px] text-subtle">Tất cả thành viên đã đóng đủ cho đợt thu này.</p>
      ) : (
        <div className="space-y-4">
          {er.form && <div role="alert" className="flex gap-2 rounded-xl bg-bad-bg p-3 text-sm font-medium text-bad"><Icon name="alert" size={18} />{er.form}</div>}
          <Field label="Thành viên nộp tiền" required error={er.mem}>
            {(p) => (
              <Select {...p} value={mem} onChange={(e) => { setMem(e.target.value); setAmount(String(rows.find((r) => r.m.id === e.target.value)?.st.remaining ?? '')) }}>
                {rows.map((r) => <option key={r.m.id} value={r.m.id}>{r.m.name} – còn thiếu {vnd(r.st.remaining)}</option>)}
              </Select>
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Số tiền nhận" required error={er.amount} hint={cur ? `Hỗ trợ đóng một phần, tối đa ${vnd(max)}` : undefined}>
              {(p) => <MoneyInput {...p} value={amount} onChange={setAmount} invalid={!!er.amount} />}
            </Field>
            <Field label="Ngày nhận" required error={er.date}>
              {(p) => <Input {...p} type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} invalid={!!er.date} />}
            </Field>
          </div>
          <Field label="Ghi chú" hint={`Ví dụ: ${shortName(cur?.m.name ?? 'Bạn')} nộp trực tiếp sau buổi sinh hoạt`}>
            {(p) => <Textarea {...p} value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20" />}
          </Field>
        </div>
      )}
    </Modal>
  )
}

export function PaymentHistory({ colId, memId }: { colId: string; memId: string }) {
  const { s } = useStore()
  const items = [
    ...s.submissions.filter((x) => x.collectionId === colId && x.memberId === memId).map((x) => ({ key: x.id, at: x.createdAt, label: 'Chuyển khoản (minh chứng)', amount: x.amount, badge: <SubBadge status={x.status} />, reason: x.status === 'rejected' ? x.rejectReason : undefined })),
    ...s.transactions.filter((t) => t.collectionId === colId && t.memberId === memId && t.source === 'contribution_cash').map((t) => ({ key: t.id, at: t.date + 'T12:00:00', label: 'Tiền mặt', amount: t.amount, badge: t.status === 'valid' ? <SubBadge status="approved" /> : <SubBadge status="cancelled" />, reason: undefined })),
  ].sort((a, b) => b.at.localeCompare(a.at))
  if (!items.length) return <p className="text-[15px] text-subtle">Chưa có lần đóng nào.</p>
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.key} className="rounded-xl bg-canvas px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="tnum text-[15px] font-bold">{vnd(i.amount)}</p>
              <p className="text-sm text-subtle">{i.label} · {i.at.includes('T12:00:00') ? fmtDate(i.at) : fmtDateTime(i.at)}</p>
            </div>
            {i.badge}
          </div>
          {i.reason && <p className="mt-2 rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad"><b>Lý do từ chối:</b> {i.reason}</p>}
        </li>
      ))}
    </ul>
  )
}
