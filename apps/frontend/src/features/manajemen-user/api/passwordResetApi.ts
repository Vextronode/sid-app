import api from '@/lib/api'
import type { Id, IsoDateString, PaginatedResponse } from '@/types'

// `expired`: disetujui tetapi batas waktu membuat kata sandi sudah lewat.
export type PasswordResetRequestStatus =
  'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'expired'

// GET /api/password-reset-requests (PasswordResetRequestResource).
export type PasswordResetRequest = {
  id: number
  status: PasswordResetRequestStatus
  requester_ip: string | null
  created_at: IsoDateString | null
  handled_at: IsoDateString | null
  approved_until: IsoDateString | null
  completed_at: IsoDateString | null
  response_notes: string | null
  handler?: { id: string; name: string } | null
  user?: {
    id: string
    name: string
    username: string
    role: string
    role_label: string | null
    has_email: boolean
    nik_masked: string | null
    rt: string | number | null
    rw: string | number | null
    hamlet: string | null
  }
}

// Pending di atas, lalu riwayat yang sudah diputuskan; { data, meta }.
export const getPasswordResetRequests = async ({
  page = 1,
  perPage,
  status,
}: {
  page?: number
  perPage?: number
  status?: Exclude<PasswordResetRequestStatus, 'expired'>
} = {}) => {
  const response = await api.get<PaginatedResponse<PasswordResetRequest>>(
    '/api/password-reset-requests',
    {
      params: { page, per_page: perPage, status: status || undefined },
    },
  )

  return response.data
}

export const approvePasswordResetRequest = (id: Id) =>
  api.post(`/api/password-reset-requests/${id}/approve`)

export const rejectPasswordResetRequest = (id: Id, notes?: string | null) =>
  api.post(`/api/password-reset-requests/${id}/reject`, { notes: notes || null })
