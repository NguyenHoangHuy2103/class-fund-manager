export const vnd = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' ₫'

export const vndShort = (n: number) => {
  const a = Math.abs(n)
  if (a >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',').replace(',0', '') + ' tr'
  if (a >= 1e3) return Math.round(n / 1e3) + 'k'
  return String(n)
}

export const fmtDate = (s: string) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '')

export const fmtDateTime = (s: string) => {
  const d = new Date(s)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())} ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}

const pad = (x: number) => String(x).padStart(2, '0')
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayISO = () => toISO(new Date())
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toISO(d)
}
export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000)

export const parseMoney = (s: string) => Number(String(s).replace(/\D/g, '')) || 0
export const groupDigits = (s: string) => {
  const d = String(s).replace(/\D/g, '').replace(/^0+/, '')
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

export const initials = (name: string) => {
  const p = name.trim().split(/\s+/)
  return (p.length > 1 ? p[p.length - 2][0] + p[p.length - 1][0] : p[0][0]).toUpperCase()
}
export const shortName = (name: string) => name.trim().split(/\s+/).slice(-1)[0]
