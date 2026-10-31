import api from '@/lib/api'
import type { Id, IsoDateString, MessageResponse, ResourceResponse } from '@/types'

// Isian pengganti saksi: NIK, dan nama (+ No. KK) bila di luar data penduduk.
export type RefillSignatureInput = {
  nik: string
  name?: string
  familyNumber?: string
}

// GET /api/signature-requests (SignatureRequestResource).
export type SignatureRequest = {
  id: number
  slot_label: string
  // Saksi (atau pihak terkait): cukup setuju, tanpa tanda tangan.
  signer_type: 'witness'
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

// Permintaan saksi yang ditujukan ke akun ini.
export const getSignatureRequests = async () => {
  const response = await api.get<ResourceResponse<SignatureRequest[]>>('/api/signature-requests')

  return response.data.data
}

// Kata sandi diminta ulang: menyetujui berarti bersedia menjadi saksi.
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

// Blokir warga desa lewat NIK: permintaan saksi darinya tidak sampai lagi.
export const addSignatureBlock = async (nik: string) => {
  const response = await api.post<MessageResponse<SignatureBlock>>('/api/signature-blocks', { nik })

  return response.data.data
}

// Pemohon mengganti saksi yang menolak/kedaluwarsa pada suratnya.
export const refillLetterSignature = async (
  letterId: Id,
  slotKey: string,
  { nik, name, familyNumber }: RefillSignatureInput,
) => {
  const response = await api.post(`/api/letters/${letterId}/signatures/${slotKey}`, {
    nik,
    // Saksi di luar data penduduk: nama (dan No. KK) diketik.
    ...(name ? { name } : {}),
    ...(familyNumber ? { family_number: familyNumber } : {}),
  })

  return response.data
}
