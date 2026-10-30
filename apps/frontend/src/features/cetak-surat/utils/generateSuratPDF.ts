// ==========================================
// generateSuratPDF.ts
// Unduh dan pratinjau PDF surat dari backend.
// template: 'digital' (TTD + stempel) atau 'wet' (area tanda tangan kosong).
// documentKey: kunci dokumen yang terbit bersama (surat.documents); kosong =
// dokumen utama.
// ==========================================

import { responseError } from '@/shared/lib/apiError'
import { MAIN_DOCUMENT } from '@/features/cetak-surat/utils/letterDocuments'

// VITE_API_URL kosong/tidak di-build -> same-origin (sama seperti src/lib/api.ts)
const apiUrl = () => (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/+$/, '')

function letterPdfUrl(surat, action, template, documentKey) {
  const params = new URLSearchParams({ template })

  if (documentKey && documentKey !== MAIN_DOCUMENT) params.set('document', documentKey)

  return `${apiUrl()}/api/letters/${surat.id}/${action}?${params}`
}

export async function downloadSuratPDF(surat, template = 'wet', documentKey = MAIN_DOCUMENT) {
  const url = letterPdfUrl(surat, 'download', template, documentKey)
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
  const documentSuffix = documentKey && documentKey !== MAIN_DOCUMENT ? `-${documentKey}` : ''
  const suffix = `${documentSuffix}${template === 'wet' ? '-ttd-basah' : ''}`

  downloadLink.href = blobUrl
  downloadLink.download = `surat-${letterNumber}${suffix}.pdf`
  document.body.appendChild(downloadLink)
  downloadLink.click()
  downloadLink.remove()

  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000)
}

// Blob PDF pratinjau; dirender sebagai canvas oleh PdfCanvasPreview.
export async function previewSuratPDF(surat, template = 'digital', documentKey = MAIN_DOCUMENT) {
  const url = letterPdfUrl(surat, 'preview', template, documentKey)

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
