import api from '@/lib/api'
import type { Id, ResourceResponse } from '@/types'

// NIK / No. KK utuh untuk tombol "lihat" di samping nilai tersamar. Hak
// akses diperiksa backend (IdentityRevealService) dan tercatat di log.

export const revealCitizenNik = async (citizenId: Id) => {
  const response = await api.get<ResourceResponse<{ nik?: string }>>(
    `/api/citizens/${citizenId}/identity`,
  )

  return response.data.data?.nik ?? ''
}

export const revealFamilyNumber = async (familyId: Id) => {
  const response = await api.get<ResourceResponse<{ no_kk?: string }>>(
    `/api/families/${familyId}/identity`,
  )

  return response.data.data?.no_kk ?? ''
}

export const revealLetterApplicantNik = async (letterId: Id) => {
  const response = await api.get<ResourceResponse<{ nik?: string }>>(
    `/api/letters/${letterId}/applicant-identity`,
  )

  return response.data.data?.nik ?? ''
}
