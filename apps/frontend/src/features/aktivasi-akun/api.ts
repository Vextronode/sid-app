import api from '@/lib/api'
import type { IsoDateString, PaginatedResponse } from '@/types'

export type ActivationStatus = 'pending' | 'approved' | 'rejected'

// Jenjang petugas: yang sedang memegang (menunggu) atau yang memutuskan.
export type ActivationLevel = 'rt' | 'rw' | 'kadus' | 'staf_sid'

// AccountRegistrationResource: satu pendaftaran akun warga.
export type AccountRegistration = {
  id: number
  status: ActivationStatus
  method: 'online' | 'manual'
  citizen: { name: string | null; nik_masked: string | null }
  username: string | null
  area: { rt: string | null; rw: string | null; hamlet: string | null }
  level: ActivationLevel | null
  can_decide: boolean
  can_manual_activate: boolean
  // Foto hanya ada selama diproses atau setelah ditolak.
  has_photo: boolean
  rejection_count: number
  // Ditolak 3 kali: hanya bisa diaktifkan manual oleh Staf SIDUTama.
  banned: boolean
  decided_by: string | null
  decided_at: IsoDateString | null
  decision_notes: string | null
  created_at: IsoDateString | null
}

type ListParams = { status?: string; page?: number; per_page?: number }

export async function getAccountRegistrations(params: ListParams = {}) {
  const response = await api.get<PaginatedResponse<AccountRegistration>>(
    '/api/account-registrations',
    { params: Object.fromEntries(Object.entries(params).filter(([, value]) => value)) },
  )

  return response.data
}

export const approveAccountRegistration = (id: number) =>
  api.post<{ message?: string }>(`/api/account-registrations/${id}/approve`)

export const rejectAccountRegistration = (id: number, notes: string) =>
  api.post<{ message?: string }>(`/api/account-registrations/${id}/reject`, { notes })

export const manualActivateAccount = (id: number) =>
  api.post<{ message?: string; temporary_password: string }>(
    `/api/account-registrations/${id}/manual-activation`,
  )

// Foto dilindungi sesi login: diambil sebagai blob lalu ditampilkan dari object URL.
export async function getAccountRegistrationPhotoUrl(id: number) {
  const response = await api.get<Blob>(`/api/account-registrations/${id}/photo`, {
    responseType: 'blob',
  })

  return URL.createObjectURL(response.data)
}

// ProfilePhotoRequestResource: permintaan warga mengganti foto profil,
// dengan jenjang pemegang yang sama seperti aktivasi akun.
export type ProfilePhotoRequest = {
  id: number
  status: ActivationStatus
  user: {
    name: string | null
    username: string | null
    nik_masked: string | null
    // Foto profil yang sedang terpasang, untuk dibandingkan.
    current_photo_url: string | null
  }
  area: { rt: string | null; rw: string | null; hamlet: string | null }
  level: ActivationLevel | null
  can_decide: boolean
  // Foto baru hanya ada selama diproses atau setelah ditolak.
  has_photo: boolean
  decided_by: string | null
  decided_at: IsoDateString | null
  decision_notes: string | null
  created_at: IsoDateString | null
}

export async function getProfilePhotoRequests(params: ListParams = {}) {
  const response = await api.get<PaginatedResponse<ProfilePhotoRequest>>(
    '/api/profile-photo-requests',
    { params: Object.fromEntries(Object.entries(params).filter(([, value]) => value)) },
  )

  return response.data
}

export const approveProfilePhotoRequest = (id: number) =>
  api.post<{ message?: string }>(`/api/profile-photo-requests/${id}/approve`)

export const rejectProfilePhotoRequest = (id: number, notes: string) =>
  api.post<{ message?: string }>(`/api/profile-photo-requests/${id}/reject`, { notes })

export async function getProfilePhotoRequestPhotoUrl(id: number) {
  const response = await api.get<Blob>(`/api/profile-photo-requests/${id}/photo`, {
    responseType: 'blob',
  })

  return URL.createObjectURL(response.data)
}
