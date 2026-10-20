// ==========================================
// generateSuratPDF.js
// Unduh dan pratinjau PDF surat dari backend.
// template: 'digital' (TTD + stempel) atau 'wet' (area tanda tangan kosong).
// ==========================================

import { responseError } from '@/shared/lib/apiError'

// VITE_API_URL kosong/tidak di-build -> same-origin (sama seperti src/lib/api.js)
const apiUrl = () => (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/+$/, '')

export async function downloadSuratPDF(surat, template = 'wet') {
  const url = `${apiUrl()}/api/letters/${surat.id}/download?template=${template}`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/pdf',
    },
  })

  if (!response.ok) {
    throw await responseError(response, 'Gagal mengunduh surat.')
  }

  const blob = await response.blob()
  const blobUrl = window.URL.createObjectURL(blob)
  const downloadLink = document.createElement('a')
  const letterNumber = String(surat.letter_number ?? surat.id).replace(/[^\w-]/g, '-')
  const suffix = template === 'wet' ? '-ttd-basah' : ''

  downloadLink.href = blobUrl
  downloadLink.download = `surat-${letterNumber}${suffix}.pdf`
  document.body.appendChild(downloadLink)
  downloadLink.click()
  downloadLink.remove()

  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000)
}

// Blob PDF pratinjau; dirender sebagai canvas oleh PdfCanvasPreview.
export async function previewSuratPDF(surat, template = 'digital') {
  const url = `${apiUrl()}/api/letters/${surat.id}/preview?template=${template}`

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/pdf',
    },
  })

  if (!response.ok) {
    throw await responseError(response, 'Gagal memuat pratinjau surat.')
  }

  const blob = await response.blob()

  return window.URL.createObjectURL(blob)
}
