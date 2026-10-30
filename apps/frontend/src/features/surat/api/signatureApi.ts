import api from '@/lib/api'
import type { Id, IsoDateString, MessageResponse, ResourceResponse } from '@/types'

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } }

// Isian pengganti slot tanda tangan: NIK warga, atau nama + berkas TTD basah.
export type RefillSignatureInput = {
  nik?: string
  name?: string
  file?: File | null
  familyNumber?: string
}

// GET /api/profile/signature.
export type MySignatureStatus = {
  has_signature: boolean
  created_at: IsoDateString | null
  // Pengajuan reset yang masih menunggu keputusan Staf SIDUTama.
  reset_request?: SignatureResetPending | null
}

export type SignatureResetPending = { id: number; created_at: IsoDateString | null }

// GET /api/signature-requests (SignatureRequestResource).
export type SignatureRequest = {
  id: number
  slot_label: string
  // `witness`: diminta menjadi saksi (cukup setuju, tanpa tanda tangan).
  signer_type: 'other' | 'witness'
  letter_type: string | null
  applicant_name: string | null
  purpose: string | null
  requested_at: IsoDateString | null
  expires_at: IsoDateString | null
}

// GET /api/signature-blocks.
export type SignatureBlock = {
  id: number
  blocked_user_name: string | null
  blocked_nik_masked: string | null
  created_at: IsoDateString | null
}

// Tanda tangan pribadi akun: diisi sekali, tidak dapat diubah sendiri.
export const getMySignature = async () => {
  const response = await api.get<ResourceResponse<MySignatureStatus>>('/api/profile/signature')

  return response.data.data
}

export const getMySignatureImage = async () => {
  const response = await api.get<Blob>('/api/profile/signature/image', { responseType: 'blob' })

  return response.data
}

export const saveMySignature = async (file: Blob & { name?: string }) => {
  const formData = new FormData()
  formData.append('signature', file, file.name || 'tanda-tangan.png')

  const response = await api.post<MessageResponse<MySignatureStatus>>(
    '/api/profile/signature',
    formData,
    multipart,
  )

  return response.data
}

// Reset darurat oleh Staf SIDUTama.
export const resetUserSignature = (userId: Id, reason: string) =>
  api.post(`/api/users/${userId}/signature/reset`, { reason })

// Pemilik akun mengajukan reset; diputuskan Staf SIDUTama.
export const requestSignatureReset = async (reason: string) => {
  const response = await api.post<MessageResponse<SignatureResetPending>>(
    '/api/profile/signature/reset-request',
    { reason },
  )

  return response.data
}

// Pending di atas, lalu riwayat yang sudah diputuskan; { data, meta }.
export const getSignatureResetRequests = async ({
  page = 1,
  perPage,
}: {
  page?: number
  perPage?: number
} = {}) => {
  const response = await api.get('/api/signature-reset-requests', {
    params: { page, per_page: perPage },
  })

  return response.data
}

export const approveSignatureResetRequest = (id: Id) =>
  api.post(`/api/signature-reset-requests/${id}/approve`)

export const rejectSignatureResetRequest = (id: Id, notes?: string | null) =>
  api.post(`/api/signature-reset-requests/${id}/reject`, { notes: notes || null })

// Permintaan tanda tangan yang ditujukan ke akun ini.
export const getSignatureRequests = async () => {
  const response = await api.get<ResourceResponse<SignatureRequest[]>>('/api/signature-requests')

  return response.data.data
}

// Kata sandi diminta ulang: menyetujui berarti membubuhkan tanda tangan.
export const acceptSignatureRequest = (id: Id, password: string) =>
  api.post(`/api/signature-requests/${id}/accept`, { password })

export const rejectSignatureRequest = (
  id: Id,
  { notes, block }: { notes?: string | null; block?: boolean } = {},
) =>
  api.post(`/api/signature-requests/${id}/reject`, { notes: notes || null, block: Boolean(block) })

export const getSignatureBlocks = async () => {
  const response = await api.get<ResourceResponse<SignatureBlock[]>>('/api/signature-blocks')

  return response.data.data
}

export const removeSignatureBlock = (id: Id) => api.delete(`/api/signature-blocks/${id}`)

// Blokir warga desa lewat NIK: permintaan TTD/saksi darinya tidak sampai lagi.
export const addSignatureBlock = async (nik: string) => {
  const response = await api.post<MessageResponse<SignatureBlock>>('/api/signature-blocks', { nik })

  return response.data.data
}

// Pemohon mengisi ulang slot tanda tangan pihak lain pada suratnya.
export const refillLetterSignature = async (
  letterId: Id,
  slotKey: string,
  { nik, name, file, familyNumber }: RefillSignatureInput,
) => {
  const formData = new FormData()

  if (file) {
    formData.append('file', file)
    formData.append('name', name ?? '')
  } else {
    formData.append('nik', nik ?? '')

    // Ganti saksi di luar data penduduk: nama (dan No. KK) diketik.
    if (name) formData.append('name', name)
    if (familyNumber) formData.append('family_number', familyNumber)
  }

  const response = await api.post(
    `/api/letters/${letterId}/signatures/${slotKey}`,
    formData,
    multipart,
  )

  return response.data
}
