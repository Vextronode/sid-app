import api from '@/lib/api'

// NIK / No. KK utuh untuk tombol "lihat" di samping nilai tersamar. Hak
// akses diperiksa backend (IdentityRevealService) dan tercatat di log.

export const revealCitizenNik = async (citizenId) => {
  const response = await api.get(`/api/citizens/${citizenId}/identity`)

  return response.data.data?.nik ?? ''
}

export const revealFamilyNumber = async (familyId) => {
  const response = await api.get(`/api/families/${familyId}/identity`)

  return response.data.data?.no_kk ?? ''
}

export const revealLetterApplicantNik = async (letterId) => {
  const response = await api.get(`/api/letters/${letterId}/applicant-identity`)

  return response.data.data?.nik ?? ''
}
