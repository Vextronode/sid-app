import api from '@/lib/api'

// Berkas surat (lampiran, dokumen pendukung) dilindungi sesi login, jadi
// diambil sebagai blob lewat klien API lalu dibuka dari object URL.
async function fetchBlobUrl(url, params) {
  const response = await api.get(url, { params, responseType: 'blob' })

  return URL.createObjectURL(response.data)
}

export async function openProtectedFile(url, params) {
  const blobUrl = await fetchBlobUrl(url, params)

  window.open(blobUrl, '_blank', 'noopener')
  // Beri waktu tab baru memuat berkas sebelum URL dilepas.
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
}

export async function downloadProtectedFile(url, filename, params) {
  const blobUrl = await fetchBlobUrl(url, params)
  const link = document.createElement('a')

  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(blobUrl)
}

export const supportingDocumentUrl = (letterId) => `/api/letters/${letterId}/supporting-document`

export const getLetterDetail = async (letterId) => {
  const response = await api.get(`/api/letters/${letterId}`)

  return response.data.data
}

// Terapkan perubahan data setelah final approve (Kasi/Kaur/Petugas Desa).
export const getFulfillmentProposal = async (letterId) => {
  const response = await api.get(`/api/letters/${letterId}/fulfillment`)

  return response.data.data
}

export const applyFulfillment = async (letterId, values, subjectNik) => {
  const response = await api.post(`/api/letters/${letterId}/fulfillment`, {
    values,
    subject_nik: subjectNik || null,
  })

  return response.data
}

// Hasil dari instansi luar setelah formulir pelayanan terbit.
export const submitLetterResult = async (letterId, files) => {
  const formData = new FormData()

  files.forEach((file) => formData.append('files[]', file))

  const response = await api.post(`/api/letters/${letterId}/results`, formData)

  return response.data
}

export const reviewLetterResult = async (letterId, resultId, decision, notes) => {
  const response = await api.patch(`/api/letters/${letterId}/results/${resultId}`, {
    decision,
    notes: notes || null,
  })

  return response.data
}
