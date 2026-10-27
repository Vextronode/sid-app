import api from '@/lib/api'

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } }

// Tanda tangan pribadi akun: diisi sekali, tidak dapat diubah sendiri.
export const getMySignature = async () => {
  const response = await api.get('/api/profile/signature')

  return response.data.data
}

export const getMySignatureImage = async () => {
  const response = await api.get('/api/profile/signature/image', { responseType: 'blob' })

  return response.data
}

export const saveMySignature = async (file) => {
  const formData = new FormData()
  formData.append('signature', file, file.name || 'tanda-tangan.png')

  const response = await api.post('/api/profile/signature', formData, multipart)

  return response.data
}

// Reset darurat oleh Staf SIDUTama.
export const resetUserSignature = (userId, reason) =>
  api.post(`/api/users/${userId}/signature/reset`, { reason })

// Permintaan tanda tangan yang ditujukan ke akun ini.
export const getSignatureRequests = async () => {
  const response = await api.get('/api/signature-requests')

  return response.data.data
}

// Kata sandi diminta ulang: menyetujui berarti membubuhkan tanda tangan.
export const acceptSignatureRequest = (id, password) =>
  api.post(`/api/signature-requests/${id}/accept`, { password })

export const rejectSignatureRequest = (id, { notes, block } = {}) =>
  api.post(`/api/signature-requests/${id}/reject`, { notes: notes || null, block: Boolean(block) })

export const getSignatureBlocks = async () => {
  const response = await api.get('/api/signature-blocks')

  return response.data.data
}

export const removeSignatureBlock = (id) => api.delete(`/api/signature-blocks/${id}`)

// Blokir warga desa lewat NIK: permintaan TTD/saksi darinya tidak sampai lagi.
export const addSignatureBlock = async (nik) => {
  const response = await api.post('/api/signature-blocks', { nik })

  return response.data.data
}

// Pemohon mengisi ulang slot tanda tangan pihak lain pada suratnya.
export const refillLetterSignature = async (
  letterId,
  slotKey,
  { nik, name, file, familyNumber },
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
