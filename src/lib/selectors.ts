import type { Collection, Member, State, Submission, Transaction } from './data'
import { addDays, daysBetween, todayISO } from './format'

export type Standing = 'paid' | 'partial' | 'pending' | 'rejected' | 'unpaid'

export const memberOf = (s: State, id?: string) => s.members.find((m) => m.id === id)
export const nameOf = (s: State, id?: string) => memberOf(s, id)?.name ?? 'Hệ thống'
export const collectionOf = (s: State, id?: string) => s.collections.find((c) => c.id === id)
export const currentUser = (s: State) => memberOf(s, s.session.userId ?? '')

export const validTx = (s: State) => s.transactions.filter((t) => t.status === 'valid')

export function paidOf(s: State, colId: string, memId: string) {
  return s.transactions
    .filter((t) => t.status === 'valid' && t.type === 'income' && t.collectionId === colId && t.memberId === memId)
    .reduce((a, t) => a + t.amount, 0)
}
export function pendingOf(s: State, colId: string, memId: string) {
  return s.submissions.filter((x) => x.status === 'pending' && x.collectionId === colId && x.memberId === memId).reduce((a, x) => a + x.amount, 0)
}

export function standing(s: State, col: Collection, memId: string) {
  const owe = col.amount
  const paid = paidOf(s, col.id, memId)
  const pending = pendingOf(s, col.id, memId)
  const remaining = Math.max(0, owe - paid)
  const subs = s.submissions.filter((x) => x.collectionId === col.id && x.memberId === memId && x.status !== 'cancelled').sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const last = subs[0]
  let status: Standing = 'unpaid'
  if (paid >= owe) status = 'paid'
  else if (pending > 0) status = 'pending'
  else if (last && last.status === 'rejected') status = 'rejected'
  else if (paid > 0) status = 'partial'
  return { owe, paid, pending, remaining, status, canSubmit: Math.max(0, owe - paid - pending), rejected: status === 'rejected' ? last : undefined }
}

export function collectionStats(s: State, col: Collection) {
  const target = col.amount * col.memberIds.length
  const rows = col.memberIds.map((id) => standing(s, col, id))
  const collected = rows.reduce((a, r) => a + Math.min(r.paid, r.owe), 0)
  return {
    target,
    collected,
    remaining: Math.max(0, target - collected),
    pct: target ? Math.round((collected / target) * 100) : 0,
    full: rows.filter((r) => r.status === 'paid').length,
    total: col.memberIds.length,
    pending: s.submissions.filter((x) => x.collectionId === col.id && x.status === 'pending').length,
  }
}

export function totals(s: State, from?: string, to?: string) {
  const list = validTx(s).filter((t) => (!from || t.date >= from) && (!to || t.date <= to))
  return {
    income: list.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0),
    expense: list.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0),
  }
}
export function balanceAt(s: State, before?: string) {
  const list = validTx(s).filter((t) => !before || t.date < before)
  const inc = list.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0)
  const exp = list.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0)
  return s.settings.openingBalance + inc - exp
}
export const balance = (s: State) => balanceAt(s)

export const openCollections = (s: State) => s.collections.filter((c) => c.status === 'open')
export const outstanding = (s: State) => openCollections(s).reduce((a, c) => a + collectionStats(s, c).remaining, 0)
export const pendingCount = (s: State) => s.submissions.filter((x) => x.status === 'pending').length
export const pendingAmount = (s: State) => s.submissions.filter((x) => x.status === 'pending').reduce((a, x) => a + x.amount, 0)

export function progressOverall(s: State) {
  const cols = openCollections(s)
  const ids = Array.from(new Set(cols.flatMap((c) => c.memberIds))).filter((id) => memberOf(s, id)?.status === 'active')
  const full = ids.filter((id) => cols.filter((c) => c.memberIds.includes(id)).every((c) => standing(s, c, id).status === 'paid')).length
  return { full, total: ids.length }
}

export const dueInfo = (due: string, status: 'open' | 'closed') => {
  if (status === 'closed') return { label: 'Đã đóng', tone: 'neutral' as const }
  const d = daysBetween(todayISO(), due)
  if (d < 0) return { label: `Quá hạn ${-d} ngày`, tone: 'danger' as const }
  if (d === 0) return { label: 'Hạn hôm nay', tone: 'warn' as const }
  if (d <= 7) return { label: `Còn ${d} ngày`, tone: 'warn' as const }
  return { label: `Còn ${d} ngày`, tone: 'neutral' as const }
}

export function weeklyBuckets(s: State, from: string, to: string) {
  const start = new Date(from + 'T00:00:00')
  const dow = (start.getDay() + 6) % 7
  let cur = addDays(from, -dow)
  const out: { start: string; end: string; income: number; expense: number }[] = []
  const list = validTx(s)
  while (cur <= to) {
    const end = addDays(cur, 6)
    const inRange = list.filter((t) => t.date >= cur && t.date <= end && t.date >= from && t.date <= to)
    out.push({
      start: cur,
      end,
      income: inRange.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0),
      expense: inRange.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0),
    })
    cur = addDays(cur, 7)
  }
  return out
}

export type { Member, Submission, Transaction }
