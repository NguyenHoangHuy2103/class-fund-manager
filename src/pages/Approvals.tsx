import { useEffect, useState } from 'react'
import { Avatar, Button, Card, ConfirmDialog, DataTable, Drawer, Empty, Field, KV, MoneyInput, PageHeader, Select, SubBadge, Toolbar, useToast, type Col } from '../components/ui'
import { fmtDate, fmtDateTime, parseMoney, vnd } from '../lib/format'
import { navigate, useRoute } from '../lib/router'
import { collectionOf, memberOf, nameOf, standing } from '../lib/selectors'
import { useStore } from '../lib/store'
import type { Submission } from '../lib/data'

export default function Approvals() {
  const { s, a } = useStore()
  const toast = useToast()
  const r = useRoute()
  const [fc, setFc] = useState('all')
  const [fs, setFs] = useState<'all' | Submission['status']>('pending')
  const [sel, setSel] = useState<string | null>(r.params.get('s'))
  const [mode, setMode] = useState<'approve' | 'reject' | null>(null)
  const [amt, setAmt] = useState('')
  useEffect(() => { if (r.params.get('s')) setSel(r.params.get('s')) }, [r.params])

  const list = s.submissions.filter((x) => (fc === 'all' || x.collectionId === fc) && (fs === 'all' || x.status === fs)).sort((p, q) => q.createdAt.localeCompare(p.createdAt))
  const cur = s.submissions.find((x) => x.id === sel)
  const close = () => { setSel(null); setMode(null); if (r.params.get('s')) r.setParam('s') }
  const col = cur && collectionOf(s, cur.collectionId)
  const mem = cur && memberOf(s, cur.memberId)
  const remaining = cur && col ? standing(s, col, cur.memberId).remaining : 0

  const cols: Col<Submission>[] = [
    { key: 'p', header: 'Người nộp', title: true, cell: (x) => <span className="flex items-center gap-3"><Avatar name={nameOf(s, x.memberId)} /><span className="font-semibold">{nameOf(s, x.memberId)}</span></span> },
    { key: 'c', header: 'Đợt thu', cell: (x) => collectionOf(s, x.collectionId)?.name },
    { key: 'a', header: 'Số tiền', align: 'right', cell: (x) => <b className="tnum">{vnd(x.amount)}</b> },
    { key: 'd', header: 'Ngày chuyển', cell: (x) => <span className="tnum">{fmtDate(x.transferDate)}</span> },
    { key: 't', header: 'Gửi lúc', cell: (x) => <span className="tnum">{fmtDateTime(x.createdAt)}</span> },
    { key: 's', header: 'Trạng thái', cell: (x) => <SubBadge status={x.status} /> },
  ]

  return (
    <>
      <PageHeader title="Xác nhận đóng tiền" desc="Đối chiếu minh chứng chuyển khoản rồi xác nhận hoặc từ chối." />
      <Card>
        <Toolbar>
          <Select aria-label="Lọc theo đợt thu" value={fc} onChange={(e) => setFc(e.target.value)} className="sm:w-64"><option value="all">Tất cả đợt thu</option>{s.collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Select aria-label="Lọc theo trạng thái" value={fs} onChange={(e) => setFs(e.target.value as typeof fs)} className="sm:w-48">
            <option value="pending">Chờ xác nhận</option><option value="approved">Đã xác nhận</option><option value="rejected">Đã từ chối</option><option value="cancelled">Đã hủy</option><option value="all">Mọi trạng thái</option>
          </Select>
        </Toolbar>
        {list.length === 0 ? <Empty icon="checkcircle" title={fs === 'pending' && fc === 'all' ? 'Không có minh chứng nào đang chờ' : 'Không có minh chứng phù hợp'} text="Khi thành viên gửi minh chứng, chúng sẽ xuất hiện ở đây." action={fs !== 'all' || fc !== 'all' ? <Button onClick={() => { setFs('all'); setFc('all') }}>Xem tất cả</Button> : undefined} /> : <DataTable cols={cols} rows={list} rowKey={(x) => x.id} onRowClick={(x) => setSel(x.id)} rowLabel={(x) => `Xem minh chứng của ${nameOf(s, x.memberId)}`} />}
      </Card>

      {cur && col && mem && (
        <Drawer title="Chi tiết minh chứng" subtitle={col.name} onClose={close}
          footer={cur.status === 'pending' ? <><Button variant="danger" onClick={() => setMode('reject')}>Từ chối</Button><Button variant="primary" icon="check" onClick={() => { setAmt(String(Math.min(cur.amount, remaining))); setMode('approve') }}>Xác nhận</Button></> : <Button onClick={close}>Đóng</Button>}>
          <div className="space-y-5">
            {cur.image ? <a href={cur.image.url} target="_blank" rel="noreferrer"><img src={cur.image.url} alt={`Minh chứng chuyển khoản của ${mem.name}`} className="max-h-96 w-full rounded-2xl border border-line bg-canvas object-contain" /></a> : <p className="rounded-xl bg-canvas p-4 text-sm text-subtle">Không có ảnh đính kèm.</p>}
            <dl className="divide-y divide-line">
              <KV label="Người nộp">{mem.name} · {mem.code}</KV>
              <KV label="Đợt thu">{col.name}</KV>
              <KV label="Số tiền">{vnd(cur.amount)}</KV>
              <KV label="Ngày chuyển">{fmtDate(cur.transferDate)}</KV>
              <KV label="Gửi lúc">{fmtDateTime(cur.createdAt)}</KV>
              <KV label="Trạng thái"><SubBadge status={cur.status} /></KV>
              <KV label="Ghi chú">{cur.note || '—'}</KV>
              {cur.status === 'pending' && <KV label="Còn thiếu của đợt">{vnd(remaining)}</KV>}
              {cur.reviewedBy && <KV label="Người xử lý">{nameOf(s, cur.reviewedBy)}</KV>}
              {cur.rejectReason && <KV label="Lý do từ chối">{cur.rejectReason}</KV>}
            </dl>
            {cur.txId && <Button variant="soft" icon="book" onClick={() => navigate('/ledger?tx=' + cur.txId)}>Xem giao dịch trong sổ quỹ</Button>}
          </div>
        </Drawer>
      )}
      {cur && mode === 'approve' && (
        <ConfirmDialog title="Xác nhận khoản đóng" confirmLabel="Xác nhận đã nhận tiền" onClose={() => setMode(null)}
          message={<>Bạn xác nhận đã nhận tiền từ <b>{mem?.name}</b>. Khoản này sẽ được ghi vào sổ quỹ và tính vào số dư.</>}
          onConfirm={() => {
            const v = parseMoney(amt)
            if (v <= 0) return 'Số tiền phải lớn hơn 0'
            if (v > remaining) return `Số tiền vượt quá khoản còn thiếu (${vnd(remaining)})`
            const res = a.approve(cur.id, v)
            if (!res.ok) return res.error
            toast('success', `Đã xác nhận ${vnd(v)} (${res.code}).`, { label: 'Xem sổ quỹ', onClick: () => navigate('/ledger') })
            setMode(null); close()
          }}>
          <Field label="Số tiền xác nhận" required hint={`Tối đa ${vnd(remaining)} (số còn thiếu)`}>{(p) => <MoneyInput {...p} value={amt} onChange={setAmt} />}</Field>
        </ConfirmDialog>
      )}
      {cur && mode === 'reject' && (
        <ConfirmDialog title="Từ chối minh chứng" tone="danger" confirmLabel="Từ chối" reasonLabel="Lý do từ chối" onClose={() => setMode(null)}
          message={<>Thành viên <b>{mem?.name}</b> sẽ thấy lý do và có thể gửi lại minh chứng.</>}
          onConfirm={(reason) => { const res = a.reject(cur.id, reason); if (!res.ok) return res.error; toast('info', 'Đã từ chối minh chứng và gửi lý do cho thành viên.'); setMode(null); close() }} />
      )}
    </>
  )
}
