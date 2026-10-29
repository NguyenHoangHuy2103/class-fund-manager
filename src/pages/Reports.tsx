import { useState } from 'react'
import { CategoryBars, FlowChart } from '../components/charts'
import { Button, Card, DataTable, Empty, Input, PageHeader, SectionTitle, Stat, Tabs, useBusy, useToast, type Col } from '../components/ui'
import { addDays, fmtDate, todayISO, vnd } from '../lib/format'
import { balanceAt, collectionStats, nameOf, totals, validTx, weeklyBuckets } from '../lib/selectors'
import { useStore } from '../lib/store'
import type { Collection } from '../lib/data'

type P = 'month' | '30d' | 'all' | 'custom'

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`

export default function Reports() {
  const { s } = useStore()
  const toast = useToast()
  const { busy, run } = useBusy()
  const today = todayISO()
  const [p, setP] = useState<P>('all')
  const [cf, setCf] = useState(s.settings.openingDate)
  const [ct, setCt] = useState(today)
  const from = p === 'month' ? today.slice(0, 8) + '01' : p === '30d' ? addDays(today, -29) : p === 'all' ? s.settings.openingDate : cf
  const to = p === 'custom' ? ct : today
  const bad = !from || !to || from > to
  const tot = totals(s, from, to)
  const open = balanceAt(s, from)
  const close = open + tot.income - tot.expense
  const list = bad ? [] : validTx(s).filter((t) => t.date >= from && t.date <= to)
  const cats = Object.entries(list.filter((t) => t.type === 'expense').reduce<Record<string, number>>((m, t) => ({ ...m, [t.category]: (m[t.category] ?? 0) + t.amount }), {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  const buckets = bad ? [] : weeklyBuckets(s, from, to)

  const cols: Col<Collection>[] = [
    { key: 'n', header: 'Đợt thu', title: true, cell: (c) => <span className="font-semibold">{c.name}</span> },
    { key: 't', header: 'Phải thu', align: 'right', cell: (c) => <span className="tnum">{vnd(collectionStats(s, c).target)}</span> },
    { key: 'c', header: 'Đã thu', align: 'right', cell: (c) => <b className="tnum text-ok">{vnd(collectionStats(s, c).collected)}</b> },
    { key: 'r', header: 'Còn thiếu', align: 'right', cell: (c) => <b className="tnum">{vnd(collectionStats(s, c).remaining)}</b> },
    { key: 'p', header: 'Tiến độ', align: 'right', cell: (c) => <span className="tnum">{collectionStats(s, c).pct}%</span> },
  ]

  const exportCsv = () => run(() => {
    const head = ['Mã GD', 'Ngày', 'Loại', 'Hạng mục', 'Nội dung', 'Người nộp/nhận', 'Số tiền (VND)', 'Người ghi']
    const rows = list.sort((a, b) => a.date.localeCompare(b.date)).map((t) => [t.code, fmtDate(t.date), t.type === 'income' ? 'Thu' : 'Chi', t.category, t.desc, t.counterparty, t.amount, nameOf(s, t.by)])
    const sum = [[], ['Số dư đầu kỳ', open], ['Tổng thu', tot.income], ['Tổng chi', tot.expense], ['Số dư cuối kỳ', close]]
    const body = [head, ...rows, ...sum].map((r) => r.map(csvCell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `bao-cao-quy-lop-${from}_${to}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast('success', `Đã xuất ${rows.length} giao dịch ra tệp CSV.`)
  })

  return (
    <>
      <PageHeader title="Báo cáo" desc={bad ? undefined : `Kỳ báo cáo: ${fmtDate(from)} – ${fmtDate(to)}`} actions={<Button variant="primary" icon="download" loading={busy} disabled={bad} onClick={exportCsv}>Xuất CSV</Button>} />
      <Card className="mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <Tabs label="Kỳ báo cáo" value={p} onChange={setP} items={[{ key: 'month', label: 'Tháng này' }, { key: '30d', label: '30 ngày' }, { key: 'all', label: 'Toàn kỳ' }, { key: 'custom', label: 'Tùy chọn' }]} />
        {p === 'custom' && (
          <div className="flex items-center gap-2">
            <Input type="date" aria-label="Từ ngày" value={cf} onChange={(e) => setCf(e.target.value)} className="sm:w-40" invalid={bad} />
            <span aria-hidden>–</span>
            <Input type="date" aria-label="Đến ngày" value={ct} max={today} onChange={(e) => setCt(e.target.value)} className="sm:w-40" invalid={bad} />
          </div>
        )}
      </Card>
      {bad ? <Card><Empty icon="calendar" title="Khoảng thời gian không hợp lệ" text="Ngày bắt đầu phải trước hoặc trùng ngày kết thúc." /></Card> : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Số dư đầu kỳ" value={vnd(open)} icon="book" />
            <Stat label="Tổng thu" value={vnd(tot.income)} icon="arrowdown" tone="success" />
            <Stat label="Tổng chi" value={vnd(tot.expense)} icon="arrowup" tone="danger" />
            <Stat label="Số dư cuối kỳ" value={vnd(close)} icon="wallet" />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="p-5 sm:p-6"><SectionTitle title="Thu – chi theo tuần" />{buckets.some((b) => b.income || b.expense) ? <FlowChart data={buckets} /> : <Empty icon="chart" title="Không có giao dịch trong kỳ" />}</Card>
            <Card className="p-5 sm:p-6"><SectionTitle title="Chi theo hạng mục" />{cats.length ? <CategoryBars data={cats} /> : <Empty icon="chart" title="Chưa có khoản chi trong kỳ" />}</Card>
          </div>
          <Card>
            <div className="p-5 pb-0 sm:p-6 sm:pb-0"><SectionTitle title="Tổng hợp các đợt thu" /></div>
            {s.collections.length === 0 ? <Empty icon="wallet" title="Chưa có đợt thu" /> : <DataTable cols={cols} rows={s.collections} rowKey={(c) => c.id} />}
          </Card>
        </div>
      )}
    </>
  )
}
