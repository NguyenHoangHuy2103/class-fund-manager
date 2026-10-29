import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { buildSeed, VERSION, type Attachment, type Role, type Settings, type State } from './data'
import { isEmail, todayISO, fmtDate, vnd } from './format'
import { balance, collectionOf, currentUser, memberOf, paidOf, pendingOf } from './selectors'

const KEY = 'quylop-demo-v1'
type R = ({ ok: true } & Record<string, any>) | { ok: false; error: string }

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (p.version === VERSION) return p
    }
  } catch {
    /* ignore */
  }
  return buildSeed()
}

function withLog(s: State, action: string, target: string, reason?: string, link?: string): State {
  const n = s.seq.log + 1
  return {
    ...s,
    seq: { ...s.seq, log: n },
    logs: [{ id: 'l' + n, at: new Date().toISOString().slice(0, 19), actorId: s.session.userId ?? '', action, target, reason, link }, ...s.logs],
  }
}

const ctx = createContext<{ state: State; actions: ReturnType<typeof makeActions> } | null>(null)

function makeActions(commit: (fn: (s: State) => State) => void, ref: { current: State }) {
  const run = (fn: (s: State) => { next?: State; res: R }): R => {
    const { next, res } = fn(ref.current)
    if (res.ok && next) commit(() => next)
    return res
  }
  const err = (error: string) => ({ res: { ok: false as const, error } })

  return {
    login(userId: string) {
      commit((s) => ({ ...s, session: { userId } }))
    },
    logout() {
      commit((s) => ({ ...s, session: { userId: null } }))
    },
    switchRole(role: Role) {
      commit((s) => {
        const pool = s.members.filter((m) => m.role === role && m.status === 'active')
        const pick = (role === 'member' && pool.find((m) => m.id === 'm4')) || pool[0]
        return pick ? { ...s, session: { userId: pick.id } } : s
      })
    },
    reset() {
      const fresh = buildSeed()
      const uid = ref.current.session.userId
      commit(() => ({ ...fresh, session: { userId: uid && fresh.members.some((m) => m.id === uid) ? uid : 'm2' } }))
    },
    markRead(ids: string[]) {
      commit((s) => ({ ...s, notifRead: Array.from(new Set([...s.notifRead, ...ids])) }))
    },

    addMember(v: { name: string; code: string; email: string; phone: string }) {
      return run((s) => {
        if (s.members.some((m) => m.code.toLowerCase() === v.code.trim().toLowerCase())) return err('Mã sinh viên này đã tồn tại')
        if (s.members.some((m) => m.email.toLowerCase() === v.email.trim().toLowerCase())) return err('Email này đã được dùng')
        const n = s.seq.mem + 1
        let next: State = { ...s, seq: { ...s.seq, mem: n }, members: [...s.members, { id: 'm' + n, name: v.name.trim(), code: v.code.trim().toUpperCase(), email: v.email.trim(), phone: v.phone.trim(), role: 'member', status: 'active', joinedAt: todayISO() }] }
        next = withLog(next, 'Thêm thành viên', `${v.name.trim()} (${v.code.trim().toUpperCase()})`, undefined, '/members')
        return { next, res: { ok: true, id: 'm' + n } }
      })
    },
    updateMember(id: string, v: { name: string; code: string; email: string; phone: string }) {
      return run((s) => {
        if (s.members.some((m) => m.id !== id && m.code.toLowerCase() === v.code.trim().toLowerCase())) return err('Mã sinh viên này đã tồn tại')
        if (s.members.some((m) => m.id !== id && m.email.toLowerCase() === v.email.trim().toLowerCase())) return err('Email này đã được dùng')
        let next: State = { ...s, members: s.members.map((m) => (m.id === id ? { ...m, name: v.name.trim(), code: v.code.trim().toUpperCase(), email: v.email.trim(), phone: v.phone.trim() } : m)) }
        next = withLog(next, 'Cập nhật thành viên', v.name.trim(), undefined, '/members')
        return { next, res: { ok: true } }
      })
    },
    changeRole(id: string, role: Role) {
      return run((s) => {
        const m = memberOf(s, id)!
        if (m.role !== role && (m.role === 'admin' || m.role === 'treasurer') && s.members.filter((x) => x.role === m.role && x.status === 'active').length <= 1)
          return err(`Lớp cần có ít nhất một ${m.role === 'admin' ? 'Quản trị lớp' : 'Thủ quỹ'}`)
        const label = { admin: 'Quản trị lớp', treasurer: 'Thủ quỹ', member: 'Thành viên' }
        let next: State = { ...s, members: s.members.map((x) => (x.id === id ? { ...x, role } : x)) }
        next = withLog(next, 'Đổi vai trò', `${m.name}: ${label[m.role]} → ${label[role]}`, undefined, '/members')
        return { next, res: { ok: true } }
      })
    },
    setMemberStatus(id: string, status: 'active' | 'left') {
      return run((s) => {
        const m = memberOf(s, id)!
        if (status === 'left') {
          if (id === s.session.userId) return err('Bạn không thể tự cho mình rời lớp')
          if ((m.role === 'admin' || m.role === 'treasurer') && s.members.filter((x) => x.role === m.role && x.status === 'active').length <= 1)
            return err(`Cần chuyển vai trò ${m.role === 'admin' ? 'Quản trị lớp' : 'Thủ quỹ'} cho người khác trước`)
        }
        let next: State = { ...s, members: s.members.map((x) => (x.id === id ? { ...x, status } : x)) }
        next = withLog(next, status === 'left' ? 'Cho rời lớp' : 'Khôi phục thành viên', m.name, undefined, '/members')
        return { next, res: { ok: true } }
      })
    },

    createCollection(v: { name: string; purpose: string; amount: number; due: string; memberIds: string[] }) {
      return run((s) => {
        if (!v.name.trim() || v.amount <= 0 || !v.due || !v.memberIds.length) return err('Thông tin đợt thu chưa hợp lệ')
        const n = s.seq.col + 1
        let next: State = {
          ...s,
          seq: { ...s.seq, col: n },
          collections: [{ id: 'c' + n, name: v.name.trim(), purpose: v.purpose.trim(), amount: v.amount, due: v.due, status: 'open', createdAt: todayISO(), createdBy: s.session.userId ?? '', memberIds: v.memberIds }, ...s.collections],
        }
        next = withLog(next, 'Tạo đợt thu', `${v.name.trim()} – ${vnd(v.amount)}/người, ${v.memberIds.length} thành viên`, undefined, '/collections/c' + n)
        return { next, res: { ok: true, id: 'c' + n } }
      })
    },
    closeCollection(id: string) {
      return run((s) => {
        const c = collectionOf(s, id)!
        if (c.status === 'closed') return err('Đợt thu đã đóng')
        if (s.submissions.some((x) => x.collectionId === id && x.status === 'pending')) return err('Còn minh chứng chờ xác nhận. Hãy xử lý trước khi đóng đợt thu.')
        let next: State = { ...s, collections: s.collections.map((x) => (x.id === id ? { ...x, status: 'closed' } : x)) }
        next = withLog(next, 'Đóng đợt thu', c.name, undefined, '/collections/' + id)
        return { next, res: { ok: true } }
      })
    },
    recordCash(v: { collectionId: string; memberId: string; amount: number; date: string; note: string }) {
      return run((s) => {
        const c = collectionOf(s, v.collectionId)
        const m = memberOf(s, v.memberId)
        if (!c || !m || c.status !== 'open') return err('Đợt thu không còn mở')
        const left = c.amount - paidOf(s, c.id, m.id)
        if (v.amount <= 0) return err('Số tiền phải lớn hơn 0')
        if (v.amount > left) return err(`Số tiền vượt quá khoản còn thiếu (${vnd(left)})`)
        const n = s.seq.tx + 1
        const code = 'GD-' + String(n).padStart(4, '0')
        let next: State = {
          ...s,
          seq: { ...s.seq, tx: n },
          transactions: [...s.transactions, { id: 't' + n, code, date: v.date, desc: `${c.name} – ${m.name}`, category: 'Đóng quỹ', type: 'income', amount: v.amount, by: s.session.userId ?? '', status: 'valid', counterparty: m.name, note: v.note || 'Nộp tiền mặt', attachment: null, collectionId: c.id, memberId: m.id, source: 'contribution_cash' }],
        }
        next = withLog(next, 'Ghi nhận tiền mặt', `${m.name} – ${vnd(v.amount)} (${c.name})`, undefined, '/collections/' + c.id)
        return { next, res: { ok: true, code } }
      })
    },
    submitProof(v: { collectionId: string; memberId: string; amount: number; transferDate: string; note: string; image: Attachment | null }) {
      return run((s) => {
        const c = collectionOf(s, v.collectionId)
        const m = memberOf(s, v.memberId)
        if (!c || !m || c.status !== 'open') return err('Đợt thu không còn mở')
        if (!c.memberIds.includes(m.id)) return err('Bạn không thuộc danh sách áp dụng của đợt thu này')
        const room = c.amount - paidOf(s, c.id, m.id) - pendingOf(s, c.id, m.id)
        if (v.amount <= 0) return err('Số tiền phải lớn hơn 0')
        if (v.amount > room) return err(`Số tiền vượt quá khoản còn thiếu (${vnd(room)})`)
        const n = s.seq.sub + 1
        let next: State = {
          ...s,
          seq: { ...s.seq, sub: n },
          submissions: [...s.submissions, { id: 's' + n, collectionId: c.id, memberId: m.id, amount: v.amount, transferDate: v.transferDate, note: v.note, image: v.image, status: 'pending', createdAt: new Date().toISOString().slice(0, 19) }],
        }
        next = withLog(next, 'Gửi minh chứng', `${c.name} – ${vnd(v.amount)}`, undefined, '/approvals?s=s' + n)
        return { next, res: { ok: true } }
      })
    },
    approve(subId: string, amount: number) {
      return run((s) => {
        const sub = s.submissions.find((x) => x.id === subId)
        if (!sub || sub.status !== 'pending') return err('Minh chứng này đã được xử lý trước đó')
        const c = collectionOf(s, sub.collectionId)!
        const m = memberOf(s, sub.memberId)!
        const left = c.amount - paidOf(s, c.id, m.id)
        if (amount <= 0) return err('Số tiền phải lớn hơn 0')
        if (amount > left) return err(`Số tiền vượt quá khoản còn thiếu (${vnd(left)})`)
        const n = s.seq.tx + 1
        const code = 'GD-' + String(n).padStart(4, '0')
        const now = new Date().toISOString().slice(0, 19)
        let next: State = {
          ...s,
          seq: { ...s.seq, tx: n },
          submissions: s.submissions.map((x) => (x.id === subId ? { ...x, status: 'approved', reviewedBy: s.session.userId ?? '', reviewedAt: now, txId: 't' + n } : x)),
          transactions: [...s.transactions, { id: 't' + n, code, date: sub.transferDate, desc: `${c.name} – ${m.name}`, category: 'Đóng quỹ', type: 'income', amount, by: s.session.userId ?? '', status: 'valid', counterparty: m.name, note: sub.note || 'Chuyển khoản', attachment: sub.image, collectionId: c.id, memberId: m.id, submissionId: sub.id, source: 'contribution_online' }],
        }
        next = withLog(next, 'Xác nhận đóng tiền', `${m.name} – ${vnd(amount)} (${c.name})`, undefined, '/approvals?s=' + subId)
        return { next, res: { ok: true, code } }
      })
    },
    reject(subId: string, reason: string) {
      return run((s) => {
        const sub = s.submissions.find((x) => x.id === subId)
        if (!sub || sub.status !== 'pending') return err('Minh chứng này đã được xử lý trước đó')
        if (!reason.trim()) return err('Vui lòng nhập lý do từ chối')
        const c = collectionOf(s, sub.collectionId)!
        const m = memberOf(s, sub.memberId)!
        let next: State = { ...s, submissions: s.submissions.map((x) => (x.id === subId ? { ...x, status: 'rejected', rejectReason: reason.trim(), reviewedBy: s.session.userId ?? '', reviewedAt: new Date().toISOString().slice(0, 19) } : x)) }
        next = withLog(next, 'Từ chối minh chứng', `${m.name} – ${c.name}`, reason.trim(), '/approvals?s=' + subId)
        return { next, res: { ok: true } }
      })
    },
    addTx(v: { type: 'income' | 'expense'; amount: number; desc: string; date: string; category: string; counterparty: string; note: string; attachment: Attachment | null }) {
      return run((s) => {
        if (v.amount <= 0) return err('Số tiền phải lớn hơn 0')
        if (v.type === 'expense' && v.amount > balance(s)) return err(`Số dư quỹ không đủ (hiện có ${vnd(balance(s))})`)
        const n = s.seq.tx + 1
        const code = 'GD-' + String(n).padStart(4, '0')
        let next: State = {
          ...s,
          seq: { ...s.seq, tx: n },
          transactions: [...s.transactions, { id: 't' + n, code, date: v.date, desc: v.desc.trim(), category: v.category, type: v.type, amount: v.amount, by: s.session.userId ?? '', status: 'valid', counterparty: v.counterparty.trim(), note: v.note.trim(), attachment: v.attachment, source: 'manual' }],
        }
        next = withLog(next, v.type === 'income' ? 'Ghi khoản thu' : 'Ghi khoản chi', `${v.desc.trim()} – ${vnd(v.amount)}`, undefined, '/ledger?tx=t' + n)
        return { next, res: { ok: true, code } }
      })
    },
    cancelTx(id: string, reason: string) {
      return run((s) => {
        const t = s.transactions.find((x) => x.id === id)
        if (!t || t.status === 'cancelled') return err('Giao dịch đã bị hủy trước đó')
        if (!reason.trim()) return err('Vui lòng nhập lý do hủy')
        if (t.type === 'income' && balance(s) - t.amount < 0) return err('Hủy khoản thu này sẽ làm số dư quỹ âm')
        let next: State = {
          ...s,
          transactions: s.transactions.map((x) => (x.id === id ? { ...x, status: 'cancelled', cancelReason: reason.trim(), cancelledBy: s.session.userId ?? '', cancelledAt: new Date().toISOString().slice(0, 19) } : x)),
          submissions: s.submissions.map((x) => (x.txId === id ? { ...x, status: 'cancelled' } : x)),
        }
        next = withLog(next, 'Hủy giao dịch', `${t.code} – ${t.desc} (${fmtDate(t.date)})`, reason.trim(), '/ledger?tx=' + id)
        return { next, res: { ok: true } }
      })
    },
    saveSettings(v: Partial<Settings>) {
      return run((s) => {
        if (!v.className?.trim() || !v.classCode?.trim()) return err('Tên lớp và mã lớp không được để trống')
        if (!/^\d{6,16}$/.test((v.accountNo ?? '').trim())) return err('Số tài khoản mẫu gồm 6–16 chữ số')
        let next: State = { ...s, settings: { ...s.settings, ...v } }
        next = withLog(next, 'Cập nhật cài đặt', 'Thông tin lớp và tài khoản nhận quỹ (mẫu)', undefined, '/settings')
        return { next, res: { ok: true } }
      })
    },
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load)
  const ref = useRef(state)
  const commit = useCallback((fn: (s: State) => State) => {
    const next = fn(ref.current)
    ref.current = next
    setState(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* quota */
    }
  }, [])
  const actions = useMemo(() => makeActions(commit, ref), [commit])
  const value = useMemo(() => ({ state, actions }), [state, actions])
  return <ctx.Provider value={value}>{children}</ctx.Provider>
}

export function useStore() {
  const c = useContext(ctx)!
  const user = currentUser(c.state)
  return { s: c.state, a: c.actions, user, role: (user?.role ?? 'member') as Role }
}

export { isEmail }
