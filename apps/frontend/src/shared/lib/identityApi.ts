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

// NIK / No. KK pihak lain di isian surat; path dari masked_payload_paths.
export const revealLetterPayloadIdentity = async (letterId: Id, path: string) => {
  const response = await api.get<ResourceResponse<{ value?: string }>>(
    `/api/letters/${letterId}/payload-identity`,
    { params: { path } },
  )

  return response.data.data?.value ?? ''
}

export const revealLetterApplicantNik = async (letterId: Id) => {
  const response = await api.get<ResourceResponse<{ nik?: string }>>(
    `/api/letters/${letterId}/applicant-identity`,
  )

  return response.data.data?.nik ?? ''
}
