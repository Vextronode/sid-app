import api from '@/lib/api'
import type { IsoDateString, LaravelPaginatedResponse, Uuid } from '@/types'

// Data usaha warga dari SKU yang terbit. Sumber: CitizenBusinessResource.

export type BusinessCategory = 'kelontong' | 'kuliner' | 'non_kuliner'
export type CimartStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'
// Dihitung backend dari masa berlaku SKU.
export type BusinessLetterStatus = 'berlaku' | 'kedaluwarsa'

export type CitizenBusiness = {
  id: Uuid
  business_name: string
  business_activity: string
  category: BusinessCategory
  category_label: string
  address: string
  email: string
  phone: string
  citizen?: { id: Uuid; name: string } | null
  letter?: { id: Uuid; letter_number: string | null; expires_at: IsoDateString | null } | null
  letter_status: BusinessLetterStatus
  // null = belum pernah didaftarkan ke Cimart.
  cimart_status: CimartStatus | null
  cimart_status_label: string
  cimart_note: string | null
  cimart_requested_at: IsoDateString | null
  cimart_decided_at: IsoDateString | null
  cimart_cancelled_at: IsoDateString | null
  // Hanya untuk pemilik usaha (Usaha Saya).
  can_request_cimart?: boolean
  can_cancel_cimart?: boolean
  created_at: IsoDateString | null
}

export type CitizenBusinessListParams = {
  page?: number
  per_page?: number
  search?: string
  category?: BusinessCategory
  letter_status?: BusinessLetterStatus
  // 'none' = belum mendaftar.
  cimart_status?: CimartStatus | 'none'
}

export type CitizenBusinessListResponse = LaravelPaginatedResponse<CitizenBusiness> & {
  total: number
}

// Data Usaha Warga: Staf SIDUTama dan petugas SKU (baca saja).
export async function getCitizenBusinesses(params: CitizenBusinessListParams = {}) {
  const response = await api.get<CitizenBusinessListResponse>('/api/citizen-businesses', { params })

  return response.data
}

export async function getCitizenBusiness(id: Uuid) {
  const response = await api.get<{ data: CitizenBusiness }>(`/api/citizen-businesses/${id}`)

  return response.data.data
}

// Usaha Saya: usaha milik akun yang login.
export async function getMyBusinesses() {
  const response = await api.get<{ data: CitizenBusiness[] }>('/api/profile/businesses')

  return response.data.data
}

export async function requestCimartApplication(id: Uuid) {
  const response = await api.post<{ data: CitizenBusiness; message: string }>(
    `/api/profile/businesses/${id}/cimart-application`,
  )

  return response.data
}

export async function cancelCimartApplication(id: Uuid) {
  const response = await api.delete<{ data: CitizenBusiness; message: string }>(
    `/api/profile/businesses/${id}/cimart-application`,
  )

  return response.data
}
