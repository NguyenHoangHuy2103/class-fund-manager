import { useState } from 'react'
import { fmtDate, vnd, vndShort } from '../lib/format'

export interface Bucket { start: string; end: string; income: number; expense: number }

export function FlowChart({ data }: { data: Bucket[] }) {
  const [hi, setHi] = useState<number | null>(null)
  const W = 640, H = 250, L = 46, B = 30, T = 12, R = 8
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]))
  const steps = [50e3, 100e3, 200e3, 250e3, 500e3, 1e6, 2e6, 2.5e6, 5e6, 1e7]
  const step = steps.find((s) => max / s <= 4) ?? 1e7
  const top = Math.ceil(max / step) * step
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step)
  const iw = W - L - R, ih = H - T - B
  const y = (v: number) => T + ih - (v / top) * ih
  const slot = iw / Math.max(1, data.length)
  const bw = Math.min(26, slot * 0.28)
  const sum = data.map((d) => `${fmtDate(d.start)}: thu ${vnd(d.income)}, chi ${vnd(d.expense)}`).join('; ')
  const h = hi !== null ? data[hi] : null
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Biểu đồ thu chi theo tuần. ${sum}`} className="w-full">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e0e8f5" strokeDasharray={t ? '3 4' : undefined} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11.5" fill="#566579">{vndShort(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = L + slot * i + slot / 2
          return (
            <g key={d.start} tabIndex={0} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} onFocus={() => setHi(i)} onBlur={() => setHi(null)} aria-label={`Tuần từ ${fmtDate(d.start)}: thu ${vnd(d.income)}, chi ${vnd(d.expense)}`} style={{ outline: 'none' }}>
              <rect x={cx - slot / 2} y={T} width={slot} height={ih} rx="8" fill={hi === i ? '#eaf2fd' : 'transparent'} />
              <rect x={cx - bw - 2} y={y(d.income)} width={bw} height={Math.max(0, y(0) - y(d.income))} rx="5" fill="#4f7ee1" />
              <rect x={cx + 2} y={y(d.expense)} width={bw} height={Math.max(0, y(0) - y(d.expense))} rx="5" fill="#2a3862" />
              <text x={cx} y={H - 9} textAnchor="middle" fontSize="11.5" fill="#566579">{d.start.slice(8, 10)}/{d.start.slice(5, 7)}</text>
            </g>
          )
        })}
      </svg>
      {h && hi !== null && (
        <div role="status" className="pointer-events-none absolute z-10 w-48 -translate-x-1/2 rounded-xl bg-ink px-3 py-2.5 text-sm text-white shadow-[var(--shadow-pop)]" style={{ left: `${Math.min(82, Math.max(18, ((L + slot * hi + slot / 2) / W) * 100))}%`, top: 0 }}>
          <p className="font-semibold">Tuần {fmtDate(h.start)} – {fmtDate(h.end)}</p>
          <p className="mt-1 flex justify-between"><span className="text-mist">Thu</span><span className="tnum font-bold">{vnd(h.income)}</span></p>
          <p className="flex justify-between"><span className="text-mist">Chi</span><span className="tnum font-bold">{vnd(h.expense)}</span></p>
        </div>
      )}
      <div className="mt-2 flex gap-5 text-sm text-subtle">
        <span className="inline-flex items-center gap-2"><i className="size-3 rounded bg-brand" />Thu</span>
        <span className="inline-flex items-center gap-2"><i className="size-3 rounded bg-deep" />Chi</span>
      </div>
    </div>
  )
}

const SHADES = ['#2a3862', '#4f7ee1', '#8bbcf2', '#6c8fd0', '#b4cdf0', '#3d4f86']
export function CategoryBars({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((a, d) => a + d.value, 0)
  return (
    <ul className="space-y-4">
      {data.map((d, i) => {
        const pct = total ? (d.value / total) * 100 : 0
        return (
          <li key={d.name}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[15px]">
              <span className="flex items-center gap-2 font-semibold"><i className="size-3 rounded" style={{ background: SHADES[i % SHADES.length] }} />{d.name}</span>
              <span className="tnum text-subtle"><b className="text-ink">{vnd(d.value)}</b> · {pct.toFixed(0)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#e3ebf8]" role="img" aria-label={`${d.name}: ${pct.toFixed(0)}%`}>
              <div className="h-full rounded-full" style={{ width: pct + '%', background: SHADES[i % SHADES.length] }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
