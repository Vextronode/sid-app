import api from '@/lib/api'
import type { Id, Letter, MessageResponse, ResourceResponse } from '@/types'

// Nilai isian Terapkan, per nama field data warga.
export type FulfillmentValues = Record<string, unknown>

// Satu warga di pratinjau Terapkan beserta perubahannya (lama -> baru).
export type FulfillmentChange = {
  citizen_id: number
  name: string
  kind: 'create' | 'update' | 'deactivate'
  // Nilai lama/baru sudah berupa teks tampilan ('-' bila kosong).
  changes: { column: string; label: string; old: string; new: string }[]
}

// GET /api/profile/nik-lookup.
export type NikLookupData = {
  found: boolean
  has_account?: boolean
  is_self?: boolean
  name?: string | null
  family_number?: string | null
}

// Berkas surat (lampiran, dokumen pendukung) dibuka/diunduh lewat
// openProtectedFile dan downloadFile di '@/lib/downloadFile'.
export const supportingDocumentUrl = (letterId: Id) =>
  `/api/letters/${letterId}/supporting-document`

export const getLetterDetail = async (letterId: Id) => {
  const response = await api.get<MessageResponse<Letter>>(`/api/letters/${letterId}`)

  return response.data.data
}

// Terapkan perubahan data setelah final approve (Kasi/Kaur/Staf SIDUTama).
export const getFulfillmentProposal = async (letterId: Id) => {
  const response = await api.get(`/api/letters/${letterId}/fulfillment`)

  return response.data.data
}

// Daftar perubahan per warga (lama -> baru) yang akan disimpan Terapkan
// dengan nilai yang sama; tidak menyimpan apa pun.
export const previewFulfillment = async (
  letterId: Id,
  values: FulfillmentValues,
  subjectNik?: string | null,
  notes?: string | null,
) => {
  const response = await api.post<ResourceResponse<FulfillmentChange[]>>(
    `/api/letters/${letterId}/fulfillment/preview`,
    {
      values,
      subject_nik: subjectNik || null,
      notes: notes || null,
    },
  )

  return response.data.data
}

export const applyFulfillment = async (
  letterId: Id,
  values: FulfillmentValues,
  subjectNik?: string | null,
  notes?: string | null,
) => {
  const response = await api.post<MessageResponse<Letter>>(`/api/letters/${letterId}/fulfillment`, {
    values,
    subject_nik: subjectNik || null,
    notes: notes || null,
  })

  return response.data
}

// Anggota KK pemohon untuk isian family_members.
export const getFamilyMembers = async () => {
  const response = await api.get('/api/profile/family-members')

  return response.data.data
}

// Nama warga desa dari NIK (isian nama ber-from_nik, mis. saksi).
// includeInactive: juga mencari warga nonaktif (mis. NIK almarhum).
export const lookupNik = async (nik: string, { includeInactive = false } = {}) => {
  const response = await api.get<MessageResponse<NikLookupData>>('/api/profile/nik-lookup', {
    params: includeInactive ? { nik, include_inactive: 1 } : { nik },
  })

  return response.data.data
}

// Dusun -> RW -> RT desa untuk isian village_area.
export const getVillageAreas = async () => {
  const response = await api.get('/api/village-areas')

  return response.data.data
}

// Hasil dari instansi luar setelah formulir pelayanan terbit.
export const submitLetterResult = async (letterId: Id, files: File[]) => {
  const formData = new FormData()

  files.forEach((file) => formData.append('files[]', file))

  const response = await api.post(`/api/letters/${letterId}/results`, formData)

  return response.data
}

export const reviewLetterResult = async (
  letterId: Id,
  resultId: Id,
  decision: 'accepted' | 'rejected',
  notes?: string | null,
) => {
  const response = await api.patch(`/api/letters/${letterId}/results/${resultId}`, {
    decision,
    notes: notes || null,
  })

  return response.data
}
