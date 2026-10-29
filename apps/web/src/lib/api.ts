export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

let onUnauthorizedCallback: (() => void) | null = null

export function setOnUnauthorized(cb: () => void) {
  onUnauthorizedCallback = cb
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  const headers = new Headers(options.headers || {})

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  // Header bảo vệ chống CSRF cho các request thay đổi dữ liệu
  headers.set('X-Requested-With', 'XMLHttpRequest')

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Luôn gửi cookie HttpOnly
  })

  if (res.status === 401) {
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback()
    }
  }

  let data: any
  const contentType = res.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    data = await res.json()
  } else {
    data = { ok: res.ok }
  }

  if (!res.ok) {
    const errorMsg = data?.error || `Yêu cầu thất bại với mã lỗi HTTP ${res.status}`
    throw new ApiError(res.status, errorMsg, data?.details)
  }

  return data
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ ok: true; data: { user: UserProfile } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    logout: () =>
      request<{ ok: true; message: string }>('/auth/logout', {
        method: 'POST',
      }),
    me: () =>
      request<{ ok: true; data: { user: UserProfile } }>('/auth/me', {
        method: 'GET',
      }),
  },

  dashboard: {
    getSummary: () =>
      request<{ ok: true; data: DashboardSummary }>('/dashboard', {
        method: 'GET',
      }),
  },

  collections: {
    list: (status: 'OPEN' | 'CLOSED' | 'ALL' = 'ALL') =>
      request<{ ok: true; data: { items: CollectionItem[]; pagination: any } }>(
        `/collections?status=${status}`,
        { method: 'GET' },
      ),
    get: (id: string) =>
      request<{ ok: true; data: CollectionDetail }>('/collections/' + id, {
        method: 'GET',
      }),
    create: (data: { name: string; description?: string; amount: number; dueDate?: string }) =>
      request<{ ok: true; data: { collection: CollectionItem } }>('/collections', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: 'OPEN' | 'CLOSED') =>
      request<{ ok: true; data: { collection: CollectionItem } }>(`/collections/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    confirmPayment: (collectionId: string, memberId: string, note?: string) =>
      request<{ ok: true; message: string; data: any }>(`/collections/${collectionId}/payments`, {
        method: 'POST',
        body: JSON.stringify({ memberId, note }),
      }),
  },

  transactions: {
    list: (params: { type?: string; category?: string; fromDate?: string; toDate?: string; search?: string } = {}) => {
      const q = new URLSearchParams()
      if (params.type && params.type !== 'ALL') q.set('type', params.type)
      if (params.category && params.category !== 'ALL') q.set('category', params.category)
      if (params.fromDate) q.set('fromDate', params.fromDate)
      if (params.toDate) q.set('toDate', params.toDate)
      if (params.search) q.set('search', params.search)
      return request<{ ok: true; data: { items: TransactionItem[]; summary: any; pagination: any } }>(
        `/transactions?${q.toString()}`,
        { method: 'GET' },
      )
    },
    getBalance: () =>
      request<{ ok: true; data: { totalIncome: number; totalExpense: number; balance: number } }>(
        '/transactions/balance',
        { method: 'GET' },
      ),
    createExpense: (data: { category: string; amount: number; date?: string; description: string; counterparty: string; note?: string }) =>
      request<{ ok: true; message: string; data: { transaction: TransactionItem } }>(
        '/transactions/expenses',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      ),
    createIncome: (data: { category: string; amount: number; date?: string; description: string; counterparty: string; note?: string }) =>
      request<{ ok: true; message: string; data: { transaction: TransactionItem } }>(
        '/transactions/incomes',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      ),
  },

  members: {
    list: (params: { search?: string; status?: string } = {}) => {
      const q = new URLSearchParams()
      if (params.search) q.set('search', params.search)
      if (params.status) q.set('status', params.status)
      return request<{ ok: true; data: { items: MemberItem[]; pagination: any } }>(
        `/members?${q.toString()}`,
        { method: 'GET' },
      )
    },
    create: (data: { code: string; name: string; email: string; phone?: string }) =>
      request<{ ok: true; message: string; data: { member: MemberItem } }>('/members', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { name?: string; phone?: string }) =>
      request<{ ok: true; message: string; data: { member: MemberItem } }>('/members/' + id, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    setStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
      request<{ ok: true; message: string; data: { member: MemberItem } }>(`/members/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },
}

export interface UserProfile {
  id: string
  email: string
  role: 'ADMIN' | 'MEMBER'
  member?: {
    id: string
    code: string
    name: string
    phone?: string
    status: 'ACTIVE' | 'INACTIVE'
  } | null
}

export interface CollectionItem {
  id: string
  name: string
  description?: string
  amount: number
  dueDate?: string
  status: 'OPEN' | 'CLOSED'
  createdAt: string
  paidCount: number
  totalMembers: number
  totalCollected: number
  targetAmount: number
  remainingAmount: number
  progressPercent: number
  myStatus: 'PAID' | 'UNPAID'
}

export interface CollectionDetail extends CollectionItem {
  members: {
    memberId: string
    name: string
    code: string
    email: string
    status: 'PAID' | 'UNPAID'
    payment?: {
      id: string
      amount: number
      paidAt: string
      confirmedBy: string
      note?: string
    } | null
  }[]
}

export interface TransactionItem {
  id: string
  code: string
  type: 'INCOME' | 'EXPENSE'
  category: string
  amount: number
  date: string
  description: string
  counterparty: string
  note?: string
  createdBy?: { id: string; email: string }
  payment?: {
    id: string
    collection?: { id: string; name: string }
    member?: { id: string; name: string; code: string }
  } | null
}

export interface MemberItem {
  id: string
  code: string
  name: string
  email: string
  phone?: string
  status: 'ACTIVE' | 'INACTIVE'
  user?: { id: string; role: 'ADMIN' | 'MEMBER' } | null
}

export interface DashboardSummary {
  balance: number
  totalIncome: number
  totalExpense: number
  totalActiveMembers: number
  myUnpaid: {
    amount: number
    count: number
  }
  totalClassRemainingToCollect: number
  openCollections: {
    id: string
    name: string
    amount: number
    dueDate?: string
    paidCount: number
    totalMembers: number
    collected: number
    target: number
    remaining: number
    percent: number
    hasMyPayment: boolean
  }[]
  recentTransactions: {
    id: string
    code: string
    type: 'INCOME' | 'EXPENSE'
    category: string
    amount: number
    date: string
    description: string
    counterparty: string
  }[]
}
