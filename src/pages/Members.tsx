import { useEffect, useState } from 'react'
import { Avatar, Badge, Button, Card, ConfirmDialog, DataTable, Drawer, Empty, Field, Icon, Input, Modal, SearchBox, Select, Toolbar, PageHeader, useBusy, useToast, type Col } from '../components/ui'
import { ROLE_LABEL, type Member, type Role } from '../lib/data'
import { isEmail, vnd } from '../lib/format'
import { useRoute } from '../lib/router'
import { openCollections, standing } from '../lib/selectors'
import { useStore } from '../lib/store'

function MemberForm({ init, onSubmit, id, busy }: { init: { name: string; code: string; email: string; phone: string }; onSubmit: (v: typeof init) => string | void; id: string; busy: boolean }) {
  const [v, setV] = useState(init)
  const [er, setEr] = useState<Record<string, string>>({})
  const set = (k: keyof typeof init) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value })
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const x: Record<string, string> = {}
    if (v.name.trim().length < 2) x.name = 'Vui lòng nhập họ tên (ít nhất 2 ký tự)'
    if (!/^[A-Za-z]{2,}\d{4,}$/.test(v.code.trim())) x.code = 'Mã sinh viên gồm chữ và số, ví dụ SE190213'
    if (!v.email.trim()) x.email = 'Vui lòng nhập email'
    else if (!isEmail(v.email)) x.email = 'Email chưa đúng định dạng'
    if (v.phone.trim() && !/^0\d{9}$/.test(v.phone.trim())) x.phone = 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0'
    setEr(x)
    if (Object.keys(x).length) return
    const r = onSubmit(v)
    if (r) setEr({ form: r })
  }
  return (
    <form id={id} onSubmit={submit} noValidate className="space-y-4">
      {er.form && <div role="alert" className="flex gap-2 rounded-xl bg-bad-bg p-3 text-sm font-medium text-bad"><Icon name="alert" size={18} />{er.form}</div>}
      <Field label="Họ và tên" required error={er.name}>{(p) => <Input {...p} data-autofocus value={v.name} onChange={set('name')} invalid={!!er.name} disabled={busy} />}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mã sinh viên" required error={er.code}>{(p) => <Input {...p} value={v.code} onChange={set('code')} invalid={!!er.code} disabled={busy} />}</Field>
        <Field label="Số điện thoại" error={er.phone} hint="Không bắt buộc">{(p) => <Input {...p} inputMode="tel" value={v.phone} onChange={set('phone')} invalid={!!er.phone} disabled={busy} />}</Field>
      </div>
      <Field label="Email" required error={er.email}>{(p) => <Input {...p} type="email" value={v.email} onChange={set('email')} invalid={!!er.email} disabled={busy} />}</Field>
    </form>
  )
}

export default function Members() {
  const { s, a } = useStore()
  const toast = useToast()
  const r = useRoute()
  const [q, setQ] = useState('')
  const [fr, setFr] = useState('all')
  const [fs, setFs] = useState('active')
  const [adding, setAdding] = useState(false)
  const [viewId, setViewId] = useState<string | null>(null)
  const [roleChange, setRoleChange] = useState<{ m: Member; role: Role } | null>(null)
  const [leaving, setLeaving] = useState<Member | null>(null)
  const { busy, run } = useBusy()

  useEffect(() => {
    if (r.params.get('new')) {
      setAdding(true)
      r.setParam('new')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const list = s.members.filter((m) => (fr === 'all' || m.role === fr) && (fs === 'all' || m.status === fs) && (`${m.name} ${m.code} ${m.email}`.toLowerCase().includes(q.trim().toLowerCase())))
  const viewing = s.members.find((m) => m.id === viewId)
  const reset = () => { setQ(''); setFr('all'); setFs('all') }

  const cols: Col<Member>[] = [
    { key: 'n', header: 'Thành viên', title: true, cell: (m) => <span className="flex items-center gap-3"><Avatar name={m.name} /><span className="min-w-0"><span className="block truncate font-semibold">{m.name}</span></span></span> },
    { key: 'c', header: 'Mã SV', cell: (m) => <span className="tnum">{m.code}</span> },
    { key: 'e', header: 'Email', cell: (m) => <span className="break-all text-subtle">{m.email}</span> },
    {
      key: 'r', header: 'Vai trò',
      cell: (m) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Select aria-label={`Vai trò của ${m.name}`} value={m.role} disabled={m.status === 'left'} className="min-h-10 w-[150px] py-0 text-sm font-semibold" onChange={(e) => setRoleChange({ m, role: e.target.value as Role })}>
            {(Object.keys(ROLE_LABEL) as Role[]).map((k) => <option key={k} value={k}>{ROLE_LABEL[k]}</option>)}
          </Select>
        </span>
      ),
    },
    { key: 's', header: 'Trạng thái', cell: (m) => m.status === 'active' ? <Badge tone="success" icon="checkcircle">Đang học</Badge> : <Badge tone="neutral" icon="logout">Đã rời lớp</Badge> },
    { key: 'a', header: '', align: 'right', noMobileLabel: true, cell: (m) => <span onClick={(e) => e.stopPropagation()}><Button size="sm" variant="soft" icon="pencil" onClick={() => setViewId(m.id)}>Xem / sửa</Button></span> },
  ]

  return (
    <>
      <PageHeader title="Thành viên" desc={`${s.members.filter((m) => m.status === 'active').length} thành viên đang học · quản lý vai trò và trạng thái trong lớp.`}
        actions={<Button variant="primary" icon="plus" onClick={() => setAdding(true)}>Thêm thành viên</Button>} />
      <Card>
        <Toolbar>
          <SearchBox value={q} onChange={setQ} placeholder="Tìm theo tên, mã SV, email" label="Tìm thành viên" />
          <Select aria-label="Lọc theo vai trò" value={fr} onChange={(e) => setFr(e.target.value)} className="sm:w-44">
            <option value="all">Mọi vai trò</option>
            {(Object.keys(ROLE_LABEL) as Role[]).map((k) => <option key={k} value={k}>{ROLE_LABEL[k]}</option>)}
          </Select>
          <Select aria-label="Lọc theo trạng thái" value={fs} onChange={(e) => setFs(e.target.value)} className="sm:w-44">
            <option value="all">Mọi trạng thái</option>
            <option value="active">Đang học</option>
            <option value="left">Đã rời lớp</option>
          </Select>
        </Toolbar>
        {list.length === 0 ? <Empty icon="search" title="Không tìm thấy thành viên phù hợp" text="Thử đổi từ khóa hoặc bỏ bớt bộ lọc." action={<Button onClick={reset}>Xóa bộ lọc</Button>} /> : <DataTable cols={cols} rows={list} rowKey={(m) => m.id} onRowClick={(m) => setViewId(m.id)} rowLabel={(m) => `Mở hồ sơ ${m.name}`} />}
      </Card>

      {adding && (
        <Modal title="Thêm thành viên" subtitle="Thành viên mới có vai trò mặc định là “Thành viên”." onClose={() => setAdding(false)} busy={busy}
          footer={<><Button onClick={() => setAdding(false)} disabled={busy}>Hủy</Button><Button type="submit" form="add-member" variant="primary" loading={busy}>Thêm thành viên</Button></>}>
          <MemberForm id="add-member" busy={busy} init={{ name: '', code: '', email: '', phone: '' }} onSubmit={(v) => {
            const dup = s.members.find((m) => m.code.toLowerCase() === v.code.trim().toLowerCase() || m.email.toLowerCase() === v.email.trim().toLowerCase())
            if (dup) return dup.code.toLowerCase() === v.code.trim().toLowerCase() ? 'Mã sinh viên này đã tồn tại' : 'Email này đã được dùng'
            run(() => { const res = a.addMember(v); if (res.ok) { toast('success', `Đã thêm ${v.name.trim()} vào lớp.`); setAdding(false) } else toast('error', res.error) })
          }} />
        </Modal>
      )}

      {viewing && (
        <Drawer title={viewing.name} subtitle={`${viewing.code} · ${ROLE_LABEL[viewing.role]}`} onClose={() => setViewId(null)}
          footer={
            viewing.status === 'active'
              ? <><Button variant="danger" icon="logout" onClick={() => setLeaving(viewing)}>Cho rời lớp</Button><Button type="submit" form="edit-member" variant="primary" loading={busy}>Lưu thay đổi</Button></>
              : <Button variant="primary" icon="refresh" onClick={() => { const res = a.setMemberStatus(viewing.id, 'active'); res.ok ? toast('success', `Đã khôi phục ${viewing.name} vào lớp.`) : toast('error', res.error) }}>Khôi phục vào lớp</Button>
          }>
          <div className="mb-5 flex items-center gap-4"><Avatar name={viewing.name} size={56} />{viewing.status === 'active' ? <Badge tone="success" icon="checkcircle">Đang học</Badge> : <Badge tone="neutral" icon="logout">Đã rời lớp</Badge>}</div>
          <MemberForm key={viewing.id + viewing.name + viewing.email} id="edit-member" busy={busy} init={{ name: viewing.name, code: viewing.code, email: viewing.email, phone: viewing.phone }} onSubmit={(v) => {
            const dup = s.members.find((m) => m.id !== viewing.id && (m.code.toLowerCase() === v.code.trim().toLowerCase() || m.email.toLowerCase() === v.email.trim().toLowerCase()))
            if (dup) return dup.code.toLowerCase() === v.code.trim().toLowerCase() ? 'Mã sinh viên này đã tồn tại' : 'Email này đã được dùng'
            run(() => { const res = a.updateMember(viewing.id, v); res.ok ? toast('success', 'Đã lưu thông tin thành viên.') : toast('error', res.error) })
          }} />
          <h3 className="mb-2 mt-7 font-bold">Khoản đóng đang mở</h3>
          <ul className="space-y-2">
            {openCollections(s).filter((c) => c.memberIds.includes(viewing.id)).map((c) => { const st = standing(s, c, viewing.id); return <li key={c.id} className="flex items-center justify-between rounded-xl bg-canvas px-3.5 py-3 text-[15px]"><span className="font-medium">{c.name}</span><span className="tnum font-semibold">{st.remaining ? `Còn ${vnd(st.remaining)}` : 'Đã đủ'}</span></li> })}
            {openCollections(s).every((c) => !c.memberIds.includes(viewing.id)) && <li className="text-[15px] text-subtle">Không thuộc đợt thu đang mở nào.</li>}
          </ul>
          {viewing.status === 'left' && <p className="mt-4 rounded-xl bg-canvas p-3 text-sm text-subtle">Lịch sử đóng quỹ và giao dịch của thành viên này vẫn được giữ nguyên.</p>}
        </Drawer>
      )}

      {roleChange && (
        <ConfirmDialog title="Đổi vai trò thành viên?" confirmLabel="Xác nhận đổi" onClose={() => setRoleChange(null)}
          message={<>Đổi vai trò của <b>{roleChange.m.name}</b> từ <b>{ROLE_LABEL[roleChange.m.role]}</b> sang <b>{ROLE_LABEL[roleChange.role]}</b>. Quyền truy cập sẽ thay đổi ngay.</>}
          onConfirm={() => { const res = a.changeRole(roleChange.m.id, roleChange.role); if (!res.ok) return res.error; toast('success', `Đã đổi vai trò của ${roleChange.m.name} thành ${ROLE_LABEL[roleChange.role]}.`); setRoleChange(null) }} />
      )}
      {leaving && (
        <ConfirmDialog title="Chuyển sang “Đã rời lớp”?" tone="danger" confirmLabel="Cho rời lớp" onClose={() => setLeaving(null)}
          message={<><b>{leaving.name}</b> sẽ không được thêm vào đợt thu mới. Lịch sử đóng quỹ và giao dịch vẫn được giữ lại, bạn có thể khôi phục bất cứ lúc nào.</>}
          onConfirm={() => { const res = a.setMemberStatus(leaving.id, 'left'); if (!res.ok) return res.error; toast('success', `${leaving.name} đã chuyển sang “Đã rời lớp”.`); setLeaving(null); setViewId(null) }} />
      )}
    </>
  )
}
