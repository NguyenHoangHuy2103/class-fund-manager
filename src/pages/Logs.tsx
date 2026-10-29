import { useState } from 'react'
import { Avatar, Button, Card, Empty, Icon, PageHeader, Select, Toolbar } from '../components/ui'
import { fmtDateTime } from '../lib/format'
import { navigate } from '../lib/router'
import { nameOf } from '../lib/selectors'
import { useStore } from '../lib/store'

export default function Logs() {
  const { s } = useStore()
  const [act, setAct] = useState('all')
  const [who, setWho] = useState('all')
  const actions = Array.from(new Set(s.logs.map((l) => l.action)))
  const actors = Array.from(new Set(s.logs.map((l) => l.actorId)))
  const list = s.logs.filter((l) => (act === 'all' || l.action === act) && (who === 'all' || l.actorId === who))
  return (
    <>
      <PageHeader title="Nhật ký hoạt động" desc="Mọi thao tác quan trọng đều được ghi lại để đối chiếu." />
      <Card>
        <Toolbar>
          <Select aria-label="Lọc theo hành động" value={act} onChange={(e) => setAct(e.target.value)} className="sm:w-56"><option value="all">Mọi hành động</option>{actions.map((x) => <option key={x}>{x}</option>)}</Select>
          <Select aria-label="Lọc theo người thực hiện" value={who} onChange={(e) => setWho(e.target.value)} className="sm:w-56"><option value="all">Mọi người</option>{actors.map((x) => <option key={x} value={x}>{nameOf(s, x)}</option>)}</Select>
          <span className="text-sm text-subtle sm:ml-auto">{list.length} mục</span>
        </Toolbar>
        {list.length === 0 ? <Empty icon="history" title="Không có hoạt động phù hợp" action={<Button onClick={() => { setAct('all'); setWho('all') }}>Xóa bộ lọc</Button>} /> : (
          <ol className="divide-y divide-line px-5">
            {list.map((l) => (
              <li key={l.id} className="flex gap-3 py-4">
                <Avatar name={nameOf(s, l.actorId)} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px]"><b>{nameOf(s, l.actorId)}</b> · <span className="font-semibold text-brand-ink">{l.action}</span></p>
                  <p className="text-[15px] text-[#2f3b4d]">{l.target}</p>
                  {l.reason && <p className="mt-1 text-sm text-subtle">Lý do: {l.reason}</p>}
                  <p className="tnum mt-1 text-sm text-subtle">{fmtDateTime(l.at)}</p>
                </div>
                {l.link && <button onClick={() => navigate(l.link!)} aria-label="Mở mục liên quan" className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-subtle hover:bg-tint"><Icon name="chevr" /></button>}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  )
}
