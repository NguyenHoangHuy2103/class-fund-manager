export type Role = 'admin' | 'treasurer' | 'member'

export interface Member {
  id: string
  code: string
  name: string
  email: string
  phone: string
  role: Role
  status: 'active' | 'left'
  joinedAt: string
}
export interface Collection {
  id: string
  name: string
  purpose: string
  amount: number
  due: string
  status: 'open' | 'closed'
  createdAt: string
  createdBy: string
  memberIds: string[]
}
export interface Attachment {
  name: string
  url: string
}
export interface Submission {
  id: string
  collectionId: string
  memberId: string
  amount: number
  transferDate: string
  note: string
  image: Attachment | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  createdAt: string
  reviewedBy?: string
  reviewedAt?: string
  rejectReason?: string
  txId?: string
}
export interface Transaction {
  id: string
  code: string
  date: string
  desc: string
  category: string
  type: 'income' | 'expense'
  amount: number
  by: string
  status: 'valid' | 'cancelled'
  cancelReason?: string
  cancelledBy?: string
  cancelledAt?: string
  counterparty: string
  note: string
  attachment: Attachment | null
  collectionId?: string
  memberId?: string
  submissionId?: string
  source: 'contribution_online' | 'contribution_cash' | 'manual'
}
export interface Log {
  id: string
  at: string
  actorId: string
  action: string
  target: string
  reason?: string
  link?: string
}
export interface Settings {
  className: string
  classCode: string
  description: string
  bankName: string
  accountNo: string
  accountHolder: string
  openingBalance: number
  openingDate: string
}
export interface State {
  version: number
  session: { userId: string | null }
  settings: Settings
  members: Member[]
  collections: Collection[]
  submissions: Submission[]
  transactions: Transaction[]
  logs: Log[]
  seq: { tx: number; sub: number; col: number; mem: number; log: number }
  notifRead: string[]
}

export const VERSION = 1
export const ROLE_LABEL: Record<Role, string> = { admin: 'Quản trị lớp', treasurer: 'Thủ quỹ', member: 'Thành viên' }
export const INCOME_CATS = ['Tài trợ', 'Thu khác']
export const EXPENSE_CATS = ['Hoạt động', 'Văn phòng phẩm', 'Quà tặng', 'Cơ sở vật chất', 'Chi khác']
export const ALL_CATS = ['Đóng quỹ', ...INCOME_CATS, ...EXPENSE_CATS]

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function sampleImage(kind: 'transfer' | 'invoice', amount: number, title: string, date: string): Attachment {
  const money = new Intl.NumberFormat('vi-VN').format(amount) + ' ₫'
  const d = date ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : ''
  const head = kind === 'transfer' ? 'Chuyển khoản thành công' : 'Hóa đơn bán lẻ'
  const rows = kind === 'transfer'
    ? [['Người nhận', 'QUY LOP SE1902'], ['Người gửi', title], ['Ngày', d], ['Nội dung', 'Dong quy lop']]
    : [['Nội dung', title], ['Ngày', d], ['Đơn vị', 'Cửa hàng mẫu'], ['Thanh toán', 'Tiền mặt']]
  const body = rows
    .map(([k, v], i) => `<text x='28' y='${236 + i * 40}' font-size='13' fill='#566579'>${esc(k)}</text><text x='332' y='${236 + i * 40}' font-size='14' font-weight='600' text-anchor='end' fill='#0c161d'>${esc(v.slice(0, 26))}</text><line x1='28' x2='332' y1='${248 + i * 40}' y2='${248 + i * 40}' stroke='#e0e8f5'/>`)
    .join('')
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='460' viewBox='0 0 360 460' font-family='Arial,sans-serif'><defs><linearGradient id='g' x1='0' y1='1' x2='1' y2='0'><stop offset='0' stop-color='#0c161d'/><stop offset='.45' stop-color='#2a3862'/><stop offset='1' stop-color='#4f7ee1'/></linearGradient></defs><rect width='360' height='460' fill='#fff'/><rect width='360' height='150' fill='url(#g)'/><circle cx='180' cy='52' r='20' fill='#fff' fill-opacity='.2'/><path d='M171 52l7 7 12-14' stroke='#fff' stroke-width='3' fill='none' stroke-linecap='round'/><text x='180' y='100' font-size='15' fill='#fff' text-anchor='middle'>${head}</text><text x='180' y='132' font-size='26' font-weight='700' fill='#fff' text-anchor='middle'>${esc(money)}</text>${body}<text x='180' y='430' font-size='11' fill='#8a97aa' text-anchor='middle'>ẢNH MẪU - DỮ LIỆU DEMO</text></svg>`
  return { name: kind === 'transfer' ? 'anh-mau-chuyen-khoan.svg' : 'chung-tu-mau.svg', url: 'data:image/svg+xml;utf8,' + encodeURIComponent(svg) }
}

export function buildSeed(): State {
  const mk = (n: number, code: string, name: string, email: string, role: Role): Member => ({
    id: 'm' + n, code, name, email: email + '@lopse1902.edu.vn', phone: '09' + String(10000000 + n * 1234567).slice(0, 8), role, status: 'active', joinedAt: '2026-09-01',
  })
  const members: Member[] = [
    mk(1, 'SE190201', 'Nguyễn Minh Khôi', 'khoi.nm', 'admin'),
    mk(2, 'SE190202', 'Trần Bảo Ngọc', 'ngoc.tb', 'treasurer'),
    mk(3, 'SE190203', 'Lê Hoàng Anh', 'anh.lh', 'member'),
    mk(4, 'SE190204', 'Phạm Thu Hà', 'ha.pt', 'member'),
    mk(5, 'SE190205', 'Võ Quốc Bảo', 'bao.vq', 'member'),
    mk(6, 'SE190206', 'Đặng Gia Linh', 'linh.dg', 'member'),
    mk(7, 'SE190207', 'Bùi Anh Tuấn', 'tuan.ba', 'member'),
    mk(8, 'SE190208', 'Hoàng Mai Chi', 'chi.hm', 'member'),
    mk(9, 'SE190209', 'Ngô Đức Thịnh', 'thinh.nd', 'member'),
    mk(10, 'SE190210', 'Đỗ Khánh Vy', 'vy.dk', 'member'),
    mk(11, 'SE190211', 'Lý Thế Vinh', 'vinh.lt', 'member'),
    mk(12, 'SE190212', 'Phan Thanh Trúc', 'truc.pt', 'member'),
  ]
  const all = members.map((m) => m.id)
  const collections: Collection[] = [
    { id: 'c1', name: 'Quỹ lớp đầu kỳ – HK1 2026', purpose: 'Chi phí sinh hoạt lớp, in ấn và quà sinh nhật trong học kỳ.', amount: 300000, due: '2026-09-15', status: 'closed', createdAt: '2026-09-01', createdBy: 'm2', memberIds: all },
    { id: 'c2', name: 'Quỹ hoạt động tháng 10', purpose: 'Nước uống, thuê phòng họp lớp và hoạt động ngoại khóa tháng 10.', amount: 150000, due: '2026-10-25', status: 'open', createdAt: '2026-10-01', createdBy: 'm2', memberIds: all },
    { id: 'c3', name: 'Quà tặng thầy cô 20/11', purpose: 'Hoa và quà tri ân thầy cô chủ nhiệm nhân ngày Nhà giáo Việt Nam.', amount: 80000, due: '2026-11-12', status: 'open', createdAt: '2026-10-05', createdBy: 'm2', memberIds: all.slice(0, 10) },
  ]
  const txs: Transaction[] = []
  const subs: Submission[] = []
  let t = 0
  let s = 0
  const memName = (id: string) => members.find((m) => m.id === id)!.name
  const colName = (id: string) => collections.find((c) => c.id === id)!.name
  const pay = (col: string, mem: string, amount: number, date: string, online: boolean) => {
    const id = 'tmp' + ++t
    let sid: string | undefined
    if (online) {
      sid = 's' + ++s
      subs.push({ id: sid, collectionId: col, memberId: mem, amount, transferDate: date, note: 'Đóng quỹ', image: sampleImage('transfer', amount, memName(mem), date), status: 'approved', createdAt: date + 'T08:30:00', reviewedBy: 'm2', reviewedAt: date + 'T19:00:00', txId: id })
    }
    txs.push({ id, code: '', date, desc: `${colName(col)} – ${memName(mem)}`, category: 'Đóng quỹ', type: 'income', amount, by: 'm2', status: 'valid', counterparty: memName(mem), note: online ? 'Chuyển khoản' : 'Nộp tiền mặt', attachment: null, collectionId: col, memberId: mem, submissionId: sid, source: online ? 'contribution_online' : 'contribution_cash' })
  }
  const manual = (type: 'income' | 'expense', date: string, desc: string, category: string, amount: number, who: string, note: string, extra: Partial<Transaction> = {}) => {
    txs.push({ id: 'tmp' + ++t, code: '', date, desc, category, type, amount, by: 'm2', status: 'valid', counterparty: who, note, attachment: type === 'expense' ? sampleImage('invoice', amount, desc, date) : null, source: 'manual', ...extra })
  }

  all.forEach((id, i) => pay('c1', id, 300000, `2026-09-${String(2 + i).padStart(2, '0')}`, i % 3 === 2))
  manual('expense', '2026-09-20', 'Liên hoan chào tân sinh viên', 'Hoạt động', 850000, 'Nhà hàng Hương Quê', 'Đặt tiệc cho 12 bạn')
  manual('expense', '2026-09-25', 'In ấn tài liệu sinh hoạt lớp', 'Văn phòng phẩm', 120000, 'Tiệm in Minh Tâm', 'In 15 bộ tài liệu')
  manual('income', '2026-09-28', 'Tài trợ từ CLB cựu sinh viên', 'Tài trợ', 500000, 'CLB cựu sinh viên', 'Hỗ trợ hoạt động lớp')
  manual('expense', '2026-10-02', 'Mua banner cổ động (mua nhầm kích thước)', 'Hoạt động', 250000, 'Cửa hàng quảng cáo An Phát', 'Đã đổi sang mẫu khác', { status: 'cancelled', cancelReason: 'Ghi nhầm, hóa đơn được hoàn tiền', cancelledBy: 'm2', cancelledAt: '2026-10-03T10:20:00' })
  ;['m1', 'm2', 'm3', 'm7', 'm10'].forEach((id, i) => pay('c2', id, 150000, `2026-10-0${2 + i}`, i % 2 === 1))
  pay('c2', 'm6', 100000, '2026-10-08', false)
  pay('c2', 'm9', 100000, '2026-10-09', false)
  manual('expense', '2026-10-05', 'Quà sinh nhật tập thể tháng 10', 'Quà tặng', 300000, 'Cửa hàng Hoa Quà', 'Sinh nhật 3 bạn')
  ;['m1', 'm2', 'm3', 'm7'].forEach((id, i) => pay('c3', id, 80000, `2026-10-1${i}`, i % 2 === 0))
  pay('c3', 'm10', 40000, '2026-10-13', false)
  manual('expense', '2026-10-12', 'Thuê hội trường họp lớp', 'Cơ sở vật chất', 200000, 'Phòng quản lý cơ sở vật chất', 'Họp lớp 2 giờ')
  manual('expense', '2026-10-18', 'Nước uống buổi sinh hoạt lớp', 'Hoạt động', 160000, 'Đại lý nước Thanh Bình', '12 chai nước lớn')

  txs.sort((a, b) => a.date.localeCompare(b.date))
  const map: Record<string, string> = {}
  txs.forEach((x, i) => {
    map[x.id] = 't' + (i + 1)
    x.id = 't' + (i + 1)
    x.code = 'GD-' + String(i + 1).padStart(4, '0')
  })
  subs.forEach((x) => {
    if (x.txId) x.txId = map[x.txId]
  })

  const addSub = (o: Omit<Submission, 'id' | 'image'> & { image?: Attachment | null }) => {
    subs.push({ ...o, id: 's' + ++s, image: o.image ?? sampleImage('transfer', o.amount, memName(o.memberId), o.transferDate) })
  }
  addSub({ collectionId: 'c2', memberId: 'm4', amount: 150000, transferDate: '2026-10-14', note: 'Đóng quỹ tháng 10', status: 'rejected', createdAt: '2026-10-14T21:05:00', reviewedBy: 'm2', reviewedAt: '2026-10-15T08:40:00', rejectReason: 'Ảnh bị mờ, không đọc được số tiền và nội dung chuyển khoản. Bạn vui lòng gửi lại ảnh rõ hơn.' })
  addSub({ collectionId: 'c2', memberId: 'm5', amount: 150000, transferDate: '2026-10-20', note: 'Quỹ tháng 10 - Bảo', status: 'pending', createdAt: '2026-10-20T09:15:00' })
  addSub({ collectionId: 'c2', memberId: 'm6', amount: 50000, transferDate: '2026-10-21', note: 'Đóng nốt phần còn lại', status: 'pending', createdAt: '2026-10-21T18:42:00' })
  addSub({ collectionId: 'c3', memberId: 'm8', amount: 80000, transferDate: '2026-10-21', note: 'Quà thầy cô', status: 'pending', createdAt: '2026-10-21T20:10:00' })

  const lg = (n: number, at: string, actorId: string, action: string, target: string, reason?: string, link?: string): Log => ({ id: 'l' + n, at, actorId, action, target, reason, link })
  const logs: Log[] = [
    lg(10, '2026-10-21T20:10:00', 'm8', 'Gửi minh chứng', 'Quà tặng thầy cô 20/11 – 80.000 ₫', undefined, '/approvals'),
    lg(9, '2026-10-21T18:42:00', 'm6', 'Gửi minh chứng', 'Quỹ hoạt động tháng 10 – 50.000 ₫', undefined, '/approvals'),
    lg(8, '2026-10-20T09:15:00', 'm5', 'Gửi minh chứng', 'Quỹ hoạt động tháng 10 – 150.000 ₫', undefined, '/approvals'),
    lg(7, '2026-10-15T08:40:00', 'm2', 'Từ chối minh chứng', 'Phạm Thu Hà – Quỹ hoạt động tháng 10', 'Ảnh bị mờ, không đọc được số tiền.', '/approvals'),
    lg(6, '2026-10-05T19:30:00', 'm2', 'Tạo đợt thu', 'Quà tặng thầy cô 20/11', undefined, '/collections/c3'),
    lg(5, '2026-10-03T10:20:00', 'm2', 'Hủy giao dịch', 'Mua banner cổ động (mua nhầm kích thước)', 'Ghi nhầm, hóa đơn được hoàn tiền', '/ledger'),
    lg(4, '2026-10-01T08:00:00', 'm2', 'Tạo đợt thu', 'Quỹ hoạt động tháng 10', undefined, '/collections/c2'),
    lg(3, '2026-09-28T16:00:00', 'm2', 'Ghi khoản thu', 'Tài trợ từ CLB cựu sinh viên – 500.000 ₫', undefined, '/ledger'),
    lg(2, '2026-09-16T09:00:00', 'm2', 'Đóng đợt thu', 'Quỹ lớp đầu kỳ – HK1 2026', undefined, '/collections/c1'),
    lg(1, '2026-09-01T08:00:00', 'm1', 'Thêm thành viên', 'Khởi tạo lớp SE1902 với 12 thành viên'),
  ]

  return {
    version: VERSION,
    session: { userId: null },
    settings: {
      className: 'SE1902',
      classCode: 'SE1902-K2026',
      description: 'Lớp Kỹ thuật phần mềm khóa 2026. Quỹ lớp dùng cho sinh hoạt, quà tặng và hoạt động ngoại khóa, công khai thu–chi cho cả lớp.',
      bankName: 'Ngân hàng Mẫu (VietBank Demo)',
      accountNo: '0123456789',
      accountHolder: 'TRAN BAO NGOC',
      openingBalance: 500000,
      openingDate: '2026-09-01',
    },
    members,
    collections,
    submissions: subs,
    transactions: txs,
    logs,
    seq: { tx: txs.length, sub: s, col: 3, mem: 12, log: 10 },
    notifRead: [],
  }
}
