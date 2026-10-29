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

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'))
  return match ? decodeURIComponent(match[3]) : null
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  const headers = new Headers(options.headers || {})

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  // Header bảo vệ chống CSRF cho các request thay đổi dữ liệu
  headers.set('X-Requested-With', 'XMLHttpRequest')
  const csrfToken = getCookie('cf_csrf_token')
  if (csrfToken) {
    headers.set('X-CSRF-Token', csrfToken)
  }

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
    register: (data: { email: string; password: string; fullName: string }) =>
      request<{ ok: true; message: string; data: { userId: string; email: string; fullName: string } }>(
        '/auth/register',
        { method: 'POST', body: JSON.stringify(data) },
      ),
    login: (email: string, password: string) =>
      request<{ ok: true; data: { user: UserProfile; activeMembership?: any; csrfToken?: string } }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      ),
    logout: () =>
      request<{ ok: true; message: string }>('/auth/logout', { method: 'POST' }),
    me: () =>
      request<{ ok: true; data: { user: UserProfile } }>('/auth/me', { method: 'GET' }),
    getCsrfToken: () =>
      request<{ ok: true; data: { csrfToken: string } }>('/auth/csrf-token', { method: 'GET' }),
    verifyEmail: (token: string) =>
      request<{ ok: true; message: string }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
    forgotPassword: (email: string) =>
      request<{ ok: true; message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token: string, newPassword: string) =>
      request<{ ok: true; message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      }),
    getGoogleUrl: () =>
      request<{ ok: true; data: { url: string } }>('/auth/google/url', { method: 'GET' }),
  },

  classes: {
    create: (data: { code: string; name: string; memberCode: string; displayName: string }) =>
      request<{ ok: true; message: string; data: { class: ClassInfo; member: MemberItem } }>(
        '/classes',
        { method: 'POST', body: JSON.stringify(data) },
      ),
    join: (data: { inviteCode: string; memberCode: string; displayName: string }) =>
      request<{ ok: true; message: string; data: { member: MemberItem } }>('/classes/join', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    reapply: (classId: string) =>
      request<{ ok: true; message: string; data: MemberItem }>('/classes/reapply', {
        method: 'POST',
        body: JSON.stringify({ classId }),
      }),
    cancelRequest: (classId: string) =>
      request<{ ok: true; message: string }>('/classes/cancel-request', {
        method: 'POST',
        body: JSON.stringify({ classId }),
      }),
    current: () =>
      request<{ ok: true; data: { class: ClassInfo } }>('/classes/current', { method: 'GET' }),
    updateInviteCode: (data: { isInviteActive?: boolean; regenerate?: boolean }) =>
      request<{ ok: true; message: string; data: { inviteCode: string; isInviteActive: boolean } }>(
        '/classes/invite-code',
        { method: 'PATCH', body: JSON.stringify(data) },
      ),
    updateBankConfig: (data: {
      bankBin: string
      bankName: string
      bankAccountNo: string
      bankAccountHolder: string
    }) =>
      request<{
        ok: true
        message: string
        data: {
          bankBin: string
          bankName: string
          bankAccountNo: string
          bankAccountHolder: string
        }
      }>('/classes/bank-config', { method: 'PATCH', body: JSON.stringify(data) }),
  },

  members: {
    list: (params: { search?: string; status?: string; page?: number; limit?: number } = {}) => {
      const q = new URLSearchParams()
      if (params.search) q.set('search', params.search)
      if (params.status && params.status !== 'ALL') q.set('status', params.status)
      if (params.page) q.set('page', String(params.page))
      if (params.limit) q.set('limit', String(params.limit))
      return request<{ ok: true; data: { items: MemberItem[]; pagination: any } }>(
        `/members?${q.toString()}`,
        { method: 'GET' },
      )
    },
    approve: (id: string) =>
      request<{ ok: true; message: string; data: { member: MemberItem } }>(
        `/members/${id}/approve`,
        { method: 'PATCH' },
      ),
    reject: (id: string) =>
      request<{ ok: true; message: string; data: { member: MemberItem } }>(
        `/members/${id}/reject`,
        { method: 'PATCH' },
      ),
    setStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
      request<{ ok: true; message: string; data: { member: MemberItem } }>(
        `/members/${id}/status`,
        { method: 'PATCH', body: JSON.stringify({ status }) },
      ),
  },

  collections: {
    create: (data: {
      name: string
      defaultAmount: string
      dueDate?: string | null
      description?: string
      targetMemberIds?: string[]
    }) =>
      request<{ ok: true; message: string; data: { collection: any; memberCount: number } }>(
        '/collections',
        { method: 'POST', body: JSON.stringify(data) },
      ),
    list: (periodId?: string) => {
      const q = periodId ? `?periodId=${periodId}` : ''
      return request<{ ok: true; data: { collections: any[] } }>(`/collections${q}`, {
        method: 'GET',
      })
    },
    detail: (id: string) =>
      request<{ ok: true; data: { collection: any } }>(`/collections/${id}`, {
        method: 'GET',
      }),
    adjustObligation: (
      collectionId: string,
      memberId: string,
      data: { targetAmount: string; discountReason: string },
    ) =>
      request<{ ok: true; message: string; data: any }>(
        `/collections/${collectionId}/members/${memberId}/obligation`,
        { method: 'PATCH', body: JSON.stringify(data) },
      ),
    getQr: (collectionId: string, params?: { memberId?: string; customAmount?: string }) => {
      const q = new URLSearchParams()
      if (params?.memberId) q.set('memberId', params.memberId)
      if (params?.customAmount) q.set('customAmount', params.customAmount)
      const qs = q.toString() ? `?${q.toString()}` : ''
      return request<{ ok: true; data: any }>(`/collections/${collectionId}/qr${qs}`, {
        method: 'GET',
      })
    },
    submitProof: (
      collectionId: string,
      data: {
        amount: string
        fileId: string
        transferCode?: string
        note?: string
        idempotencyKey?: string
      },
    ) =>
      request<{ ok: true; message: string; data: any }>(
        `/collections/${collectionId}/proofs`,
        { method: 'POST', body: JSON.stringify(data) },
      ),
    getProofs: (collectionId?: string, status?: string) => {
      const q = new URLSearchParams()
      if (collectionId) q.set('collectionId', collectionId)
      if (status) q.set('status', status)
      const qs = q.toString() ? `?${q.toString()}` : ''
      return request<{ ok: true; data: { proofs: any[] } }>(`/collections/proofs/all${qs}`, {
        method: 'GET',
      })
    },
    approveProof: (proofId: string, actualAmount?: string) =>
      request<{ ok: true; message: string; data: any }>(
        `/collections/proofs/${proofId}/approve`,
        {
          method: 'PATCH',
          body: actualAmount ? JSON.stringify({ actualAmount }) : undefined,
        },
      ),
    batchApproveProofs: (proofIds: string[]) =>
      request<{ ok: true; message: string; data: any }>(
        `/collections/proofs/batch-approve`,
        { method: 'PATCH', body: JSON.stringify({ proofIds }) },
      ),
    rejectProof: (proofId: string, rejectReason: string) =>
      request<{ ok: true; message: string; data: any }>(
        `/collections/proofs/${proofId}/reject`,
        { method: 'PATCH', body: JSON.stringify({ rejectReason }) },
      ),
    recordCash: (
      collectionId: string,
      data: {
        classMemberId: string
        amount: string
        note?: string
        idempotencyKey?: string
      },
    ) =>
      request<{ ok: true; message: string; data: any }>(
        `/collections/${collectionId}/payments/cash`,
        { method: 'POST', body: JSON.stringify(data) },
      ),
    recordCashBatch: (
      collectionId: string,
      data: {
        items: Array<{ classMemberId: string; amount: string; note?: string }>
        idempotencyKey?: string
      },
    ) =>
      request<{ ok: true; message: string; data: any }>(
        `/collections/${collectionId}/payments/cash-batch`,
        { method: 'POST', body: JSON.stringify(data) },
      ),
  },

  storage: {
    upload: async (file: File, category = 'PAYMENT_PROOF') => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category)
      return request<{
        ok: true
        message: string
        data: {
          fileId: string
          originalName: string
          mimeType: string
          sizeBytes: number
          category: string
        }
      }>('/storage/upload', {
        method: 'POST',
        body: formData,
      })
    },
    getFileUrl: (fileId: string) => `${API_BASE}/storage/files/${fileId}`,
  },

  dashboard: {
    overview: () =>
      request<{ ok: true; data: any }>('/dashboard/overview', { method: 'GET' }),
  },

  transactions: {
    list: (params?: { periodId?: string; fundType?: string; type?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams()
      if (params?.periodId) q.set('periodId', params.periodId)
      if (params?.fundType) q.set('fundType', params.fundType)
      if (params?.type) q.set('type', params.type)
      if (params?.page) q.set('page', String(params.page))
      if (params?.limit) q.set('limit', String(params.limit))
      const qs = q.toString() ? `?${q.toString()}` : ''
      return request<{ ok: true; data: { items: any[]; pagination: any } }>(`/transactions${qs}`, {
        method: 'GET',
      })
    },
  },
}

export interface UserProfile {
  id: string
  email: string
  fullName: string
  phone?: string | null
  avatarUrl?: string | null
  globalRole: 'SUPER_ADMIN' | 'USER'
  isEmailVerified: boolean
  memberships: {
    id: string
    classId: string
    memberCode?: string | null
    displayName: string
    role: 'TREASURER' | 'MEMBER'
    status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE'
    class: ClassInfo
  }[]
  createdClass?: ClassInfo | null
}

export interface ClassInfo {
  id: string
  code: string
  name: string
  inviteCode: string
  isInviteActive: boolean
  bankBin?: string | null
  bankName?: string | null
  bankAccountNo?: string | null
  bankAccountHolder?: string | null
  periods?: {
    id: string
    name: string
    status: 'OPEN' | 'CLOSED'
  }[]
}

export interface MemberItem {
  id: string
  classId: string
  userId: string
  memberCode?: string | null
  displayName: string
  role: 'TREASURER' | 'MEMBER'
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE'
  joinedAt: string
  user?: {
    id: string
    email: string
    phone?: string | null
    avatarUrl?: string | null
  }
}
