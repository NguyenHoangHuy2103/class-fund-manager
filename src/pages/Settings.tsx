import { useState } from 'react'
import { Badge, Button, Card, Field, Input, PageHeader, Textarea, useBusy, useToast } from '../components/ui'
import { useStore } from '../lib/store'

export default function Settings() {
  const { s, a } = useStore()
  const toast = useToast()
  const { busy, run } = useBusy()
  const init = { className: s.settings.className, classCode: s.settings.classCode, description: s.settings.description, bankName: s.settings.bankName, accountNo: s.settings.accountNo, accountHolder: s.settings.accountHolder }
  const [f, setF] = useState(init)
  const [er, setEr] = useState<Record<string, string>>({})
  const dirty = (Object.keys(init) as (keyof typeof init)[]).some((k) => init[k] !== f[k])
  const set = (k: keyof typeof init) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const save = () => {
    const e: Record<string, string> = {}
    if (!f.className.trim()) e.className = 'Vui lòng nhập tên lớp'
    if (!f.classCode.trim()) e.classCode = 'Vui lòng nhập mã lớp'
    if (!/^\d{6,16}$/.test(f.accountNo.trim())) e.accountNo = 'Số tài khoản mẫu gồm 6–16 chữ số'
    if (!f.bankName.trim()) e.bankName = 'Vui lòng nhập tên ngân hàng'
    if (!f.accountHolder.trim()) e.accountHolder = 'Vui lòng nhập tên chủ tài khoản'
    setEr(e)
    if (Object.keys(e).length) return
    run(() => {
      const r = a.saveSettings({ ...f, className: f.className.trim(), classCode: f.classCode.trim(), accountNo: f.accountNo.trim() })
      if (r.ok) toast('success', 'Đã lưu cài đặt lớp.')
      else setEr({ form: r.error })
    })
  }
  return (
    <>
      <PageHeader title="Cài đặt lớp" desc="Thông tin chung và tài khoản nhận quỹ hiển thị cho thành viên." />
      <div className="grid max-w-4xl gap-5">
        {er.form && <div role="alert" className="rounded-xl bg-bad-bg p-3 text-sm font-medium text-bad">{er.form}</div>}
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-bold">Thông tin lớp</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tên lớp" required error={er.className}>{(p) => <Input {...p} value={f.className} onChange={set('className')} invalid={!!er.className} />}</Field>
            <Field label="Mã lớp" required error={er.classCode}>{(p) => <Input {...p} value={f.classCode} onChange={set('classCode')} invalid={!!er.classCode} />}</Field>
          </div>
          <Field label="Mô tả">{(p) => <Textarea {...p} className="min-h-24" value={f.description} onChange={set('description')} />}</Field>
        </Card>
        <Card className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-bold">Tài khoản nhận quỹ</h2><Badge tone="warn" icon="info">Dữ liệu mẫu</Badge></div>
          <p className="text-sm text-subtle">Đây là thông tin mẫu cho bản demo, không phải tài khoản thật.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ngân hàng" required error={er.bankName}>{(p) => <Input {...p} value={f.bankName} onChange={set('bankName')} invalid={!!er.bankName} />}</Field>
            <Field label="Số tài khoản" required error={er.accountNo}>{(p) => <Input {...p} inputMode="numeric" value={f.accountNo} onChange={set('accountNo')} invalid={!!er.accountNo} />}</Field>
          </div>
          <Field label="Chủ tài khoản" required error={er.accountHolder}>{(p) => <Input {...p} value={f.accountHolder} onChange={set('accountHolder')} invalid={!!er.accountHolder} />}</Field>
        </Card>
        <div className="flex justify-end gap-2">
          <Button disabled={!dirty || busy} onClick={() => { setF(init); setEr({}) }}>Hoàn tác</Button>
          <Button variant="primary" loading={busy} disabled={!dirty} onClick={save}>Lưu thay đổi</Button>
        </div>
      </div>
    </>
  )
}
