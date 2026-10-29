import { useEffect, useState } from 'react'
import { Badge, Button, Card, ConfirmDialog, DataTable, Drawer, Empty, Field, FilePick, Input, KV, Modal, MoneyInput, PageHeader, SearchBox, Select, Tabs, Textarea, Toolbar, cx, useBusy, useToast, type Col } from '../components/ui'
import { ALL_CATS, EXPENSE_CATS, INCOME_CATS, sampleImage, type Attachment, type Transaction } from '../lib/data'
import { fmtDate, fmtDateTime, parseMoney, todayISO, vnd } from '../lib/format'
import { navigate, useRoute } from '../lib/router'
import { balance, collectionOf, nameOf } from '../lib/selectors'
import { useStore } from '../lib/store'

function TxForm({ type, onClose }: { type: 'income' | 'expense'; onClose: () => void }) {
  const { s, a } = useStore()
  const toast = useToast()
  const { busy, run } = useBusy()
  const exp = type === 'expense'
  const cats = exp ? EXPENSE_CATS : INCOME_CATS
  const [f, setF] = useState({ amount: '', desc: '', date: todayISO(), category: cats[0], counterparty: '', note: '' })
  const [att, setAtt] = useState<Attachment | null>(null)
  const [er, setEr] = useState<Record<string, string>>({})
  const submit = () => {
    const e: Record<string, string> = {}
    const v = parseMoney(f.amount)
    if (v <= 0) e.amount = 'Số tiền phải lớn hơn 0'
    else if (exp && v > balance(s)) e.amount = `Số tiền chi vượt số dư quỹ hiện tại (${vnd(balance(s))})`
    if (f.desc.trim().length < 3) e.desc = 'Vui lòng nhập nội dung (ít nhất 3 ký tự)'
    if (!f.date) e.date = 'Vui lòng chọn ngày'
    else if (f.date > todayISO()) e.date = 'Ngày không được ở tương lai'
    if (!f.counterparty.trim()) e.cp = exp ? 'Vui lòng nhập người/đơn vị nhận tiền' : 'Vui lòng nhập người/đơn vị nộp tiền'
    setEr(e)
    if (Object.keys(e).length) return
    run(() => {
      const r = a.addTx({ type, amount: v, desc: f.desc.trim(), date: f.date, category: f.category, counterparty: f.counterparty.trim(), note: f.note.trim(), attachment: att })
      if (r.ok) { toast('success', `Đã ghi ${exp ? 'khoản chi' : 'khoản thu'} ${vnd(v)} (${r.code}).`); onClose() } else setEr({ form: r.error })
    })
  }
  return (
    <Modal title={exp ? 'Ghi khoản chi' : 'Ghi khoản thu'} subtitle={exp ? `Số dư hiện tại ${vnd(balance(s))}` : 'Khoản thu ngoài các đợt đóng quỹ'} size="lg" onClose={onClose} busy={busy}
      footer={<><Button onClick={onClose} disabled={busy}>Hủy</Button><Button variant="primary" loading={busy} onClick={submit}>{exp ? 'Ghi khoản chi' : 'Ghi khoản thu'}</Button></>}>
      <div className="space-y-4">
        {er.form && <div role="alert" className="rounded-xl bg-bad-bg p-3 text-sm font-medium text-bad">{er.form}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Số tiền" required error={er.amount}>{(p) => <MoneyInput {...p} data-autofocus value={f.amount} onChange={(v) => setF({ ...f, amount: v })} invalid={!!er.amount} />}</Field>
          <Field label="Ngày giao dịch" required error={er.date}>{(p) => <Input {...p} type="date" max={todayISO()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} invalid={!!er.date} />}</Field>
        </div>
        <Field label="Nội dung" required error={er.desc}>{(p) => <Input {...p} value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} invalid={!!er.desc} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hạng mục" required>{(p) => <Select {...p} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{cats.map((c) => <option key={c}>{c}</option>)}</Select>}</Field>
          <Field label={exp ? 'Người/đơn vị nhận' : 'Người/đơn vị nộp'} required error={er.cp}>{(p) => <Input {...p} value={f.counterparty} onChange={(e) => setF({ ...f, counterparty: e.target.value })} invalid={!!er.cp} />}</Field>
        </div>
        <Field label="Ghi chú" hint="Không bắt buộc">{(p) => <Textarea {...p} className="min-h-20" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />}</Field>
        <div>
          <p className="mb-1.5 text-sm font-semibold">Chứng từ đính kèm <span className="font-normal text-subtle">(không bắt buộc)</span></p>
          <FilePick value={att} onChange={setAtt} sampleLabel="Dùng chứng từ mẫu" sample={() => sampleImage('invoice', parseMoney(f.amount) || 150000, f.desc || 'Chứng từ mẫu', f.date)} />
        </div>
      </div>
    </Modal>
  )
}

export default function Ledger() {
  const { s, a, role } = useStore()
  const toast = useToast()
  const r = useRoute()
  const [tab, setTab] = useState<'all' | 'income' | 'expense'>((r.params.get('tab') as 'income' | 'expense') || 'all')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [form, setForm] = useState<null | 'income' | 'expense'>(null)
  const [sel, setSel] = useState<string | null>(r.params.get('tx'))
  const [cancel, setCancel] = useState(false)
  const staff = role === 'treasurer'
  useEffect(() => {
    if (r.params.get('new') === 'expense' && staff) { setForm('expense'); r.setParam('new') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { if (r.params.get('tx')) setSel(r.params.get('tx')) }, [r.params])
  useEffect(() => { const t = r.params.get('tab'); if (t === 'income' || t === 'expense') setTab(t) }, [r.params])

  const list = [...s.transactions].filter((t) =>
    (tab === 'all' || t.type === tab) && (cat === 'all' || t.category === cat) && (!from || t.date >= from) && (!to || t.date <= to) &&
    `${t.code} ${t.desc} ${t.counterparty}`.toLowerCase().includes(q.trim().toLowerCase()),
  ).sort((x, y) => y.date.localeCompare(x.date) || y.id.localeCompare(x.id, undefined, { numeric: true }))
  const dateBad = !!from && !!to && from > to
  const filtered = !!(q || cat !== 'all' || from || to)
  const cur = s.transactions.find((t) => t.id === sel)
  const closeD = () => { setSel(null); if (r.params.get('tx')) r.setParam('tx') }
  const col = cur?.collectionId ? collectionOf(s, cur.collectionId) : undefined

  const cols: Col<Transaction>[] = [
    { key: 'c', header: 'Mã GD', cell: (t) => <span className="tnum font-semibold">{t.code}</span> },
    { key: 'd', header: 'Ngày', cell: (t) => <span className="tnum">{fmtDate(t.date)}</span> },
    { key: 'n', header: 'Nội dung', title: true, cell: (t) => <span className={cx('font-semibold', t.status === 'cancelled' && 'text-subtle line-through')}>{t.desc}</span> },
    { key: 'g', header: 'Hạng mục', cell: (t) => t.category },
    { key: 't', header: 'Loại', cell: (t) => t.type === 'income' ? <Badge tone="success" icon="arrowdown">Thu</Badge> : <Badge tone="danger" icon="arrowup">Chi</Badge> },
    { key: 'a', header: 'Số tiền', align: 'right', cell: (t) => <b className={cx('tnum', t.status === 'cancelled' ? 'text-subtle line-through' : t.type === 'income' ? 'text-ok' : 'text-bad')}>{t.type === 'income' ? '+' : '−'}{vnd(t.amount)}</b> },
    { key: 'b', header: 'Người ghi', cell: (t) => nameOf(s, t.by) },
    { key: 's', header: 'Trạng thái', cell: (t) => t.status === 'valid' ? <Badge tone="success" icon="check">Hợp lệ</Badge> : <Badge tone="neutral" icon="ban">Đã hủy</Badge> },
  ]

  return (
    <>
      <PageHeader title="Sổ thu – chi" desc="Toàn bộ giao dịch của quỹ lớp, công khai cho mọi thành viên." actions={staff && <><Button icon="plus" onClick={() => setForm('income')}>Ghi khoản thu</Button><Button variant="primary" icon="plus" onClick={() => setForm('expense')}>Ghi khoản chi</Button></>} />
      <Card>
        <Toolbar>
          <Tabs label="Loại giao dịch" value={tab} onChange={setTab} items={[{ key: 'all', label: 'Tất cả' }, { key: 'income', label: 'Thu' }, { key: 'expense', label: 'Chi' }]} />
          <SearchBox value={q} onChange={setQ} placeholder="Tìm mã, nội dung, người nộp/nhận" label="Tìm giao dịch" />
          <Select aria-label="Lọc theo hạng mục" value={cat} onChange={(e) => setCat(e.target.value)} className="sm:w-44"><option value="all">Mọi hạng mục</option>{ALL_CATS.map((c) => <option key={c}>{c}</option>)}</Select>
          <div className="flex items-center gap-2">
            <Input type="date" aria-label="Từ ngày" value={from} onChange={(e) => setFrom(e.target.value)} className="sm:w-40" />
            <span aria-hidden>–</span>
            <Input type="date" aria-label="Đến ngày" value={to} onChange={(e) => setTo(e.target.value)} className="sm:w-40" invalid={dateBad} />
          </div>
        </Toolbar>
        {dateBad && <p role="alert" className="px-5 pb-3 text-sm font-medium text-bad">Ngày bắt đầu phải trước ngày kết thúc.</p>}
        {list.length === 0 ? <Empty icon={filtered ? 'search' : 'book'} title={filtered ? 'Không có giao dịch phù hợp' : 'Chưa có giao dịch nào'} text={filtered ? 'Thử đổi từ khóa hoặc nới rộng bộ lọc.' : undefined} action={filtered ? <Button onClick={() => { setQ(''); setCat('all'); setFrom(''); setTo(''); setTab('all') }}>Xóa bộ lọc</Button> : undefined} /> : <DataTable cols={cols} rows={list} rowKey={(t) => t.id} onRowClick={(t) => setSel(t.id)} rowLabel={(t) => `Xem giao dịch ${t.code}`} />}
      </Card>

      {form && <TxForm type={form} onClose={() => setForm(null)} />}
      {cur && (
        <Drawer title={`Giao dịch ${cur.code}`} subtitle={cur.type === 'income' ? 'Khoản thu' : 'Khoản chi'} onClose={closeD}
          footer={staff && cur.status === 'valid' ? <><Button onClick={closeD}>Đóng</Button><Button variant="danger" icon="ban" onClick={() => setCancel(true)}>Hủy giao dịch</Button></> : <Button onClick={closeD}>Đóng</Button>}>
          <div className="space-y-5">
            <div className="rounded-2xl bg-canvas p-5">
              <p className="text-sm font-semibold text-subtle">{cur.desc}</p>
              <p className={cx('tnum mt-1 text-3xl font-extrabold', cur.status === 'cancelled' ? 'text-subtle line-through' : cur.type === 'income' ? 'text-ok' : 'text-bad')}>{cur.type === 'income' ? '+' : '−'}{vnd(cur.amount)}</p>
              {cur.status === 'cancelled' && <p className="mt-2 text-sm font-semibold text-subtle">Giao dịch đã hủy, không tính vào số dư.</p>}
            </div>
            <dl className="divide-y divide-line">
              <KV label="Ngày">{fmtDate(cur.date)}</KV>
              <KV label="Hạng mục">{cur.category}</KV>
              <KV label={cur.type === 'income' ? 'Người nộp' : 'Người nhận'}>{cur.counterparty || '—'}</KV>
              <KV label="Người ghi">{nameOf(s, cur.by)}</KV>
              <KV label="Ghi chú">{cur.note || '—'}</KV>
              {col && <KV label="Đợt thu"><button onClick={() => navigate('/collections/' + col.id)} className="font-semibold text-brand-ink hover:underline">{col.name}</button></KV>}
              {cur.status === 'cancelled' && <><KV label="Lý do hủy">{cur.cancelReason}</KV><KV label="Hủy bởi">{nameOf(s, cur.cancelledBy)} · {cur.cancelledAt && fmtDateTime(cur.cancelledAt)}</KV></>}
            </dl>
            {cur.attachment && <div><p className="mb-2 text-sm font-semibold">Chứng từ đính kèm</p><a href={cur.attachment.url} target="_blank" rel="noreferrer"><img src={cur.attachment.url} alt={`Chứng từ ${cur.code}`} className="max-h-80 w-full rounded-2xl border border-line bg-canvas object-contain" /></a></div>}
          </div>
        </Drawer>
      )}
      {cur && cancel && (
        <ConfirmDialog title="Hủy giao dịch này?" tone="danger" confirmLabel="Hủy giao dịch" reasonLabel="Lý do hủy" onClose={() => setCancel(false)}
          message={<>Giao dịch <b>{cur.code}</b> ({vnd(cur.amount)}) vẫn hiển thị trong sổ nhưng không còn được tính vào số dư.</>}
          onConfirm={(reason) => { const res = a.cancelTx(cur.id, reason); if (!res.ok) return res.error; toast('success', `Đã hủy giao dịch ${cur.code}.`); setCancel(false) }} />
      )}
    </>
  )
}
