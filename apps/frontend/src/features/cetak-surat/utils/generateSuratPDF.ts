// ==========================================
// generateSuratPDF.ts
// Unduh dan pratinjau PDF surat dari backend. Surat terbit tanpa TTD dan
// stempel: desa mencetaknya lalu menandatangani dan menstempel basah.
// documentKey: kunci dokumen yang terbit bersama (surat.documents); kosong =
// dokumen utama.
// ==========================================

import { responseError } from '@/shared/lib/apiError'
import { MAIN_DOCUMENT } from '@/features/cetak-surat/utils/letterDocuments'
import type { PrintableLetter } from '@/features/cetak-surat/utils/letterDocuments'

// VITE_API_URL kosong/tidak di-build -> same-origin (sama seperti src/lib/api.ts)
const apiUrl = () => (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/+$/, '')

function letterPdfUrl(
  surat: Pick<PrintableLetter, 'id'>,
  action: 'download' | 'preview',
  documentKey: string,
) {
  const query =
    documentKey && documentKey !== MAIN_DOCUMENT
      ? `?${new URLSearchParams({ document: documentKey })}`
      : ''

  return `${apiUrl()}/api/letters/${surat.id}/${action}${query}`
}

export async function downloadSuratPDF(surat: PrintableLetter, documentKey = MAIN_DOCUMENT) {
  const url = letterPdfUrl(surat, 'download', documentKey)
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
  const suffix = documentKey && documentKey !== MAIN_DOCUMENT ? `-${documentKey}` : ''

  downloadLink.href = blobUrl
  downloadLink.download = `surat-${letterNumber}${suffix}.pdf`
  document.body.appendChild(downloadLink)
  downloadLink.click()
  downloadLink.remove()

  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000)
}

// Blob PDF pratinjau; dirender sebagai canvas oleh PdfCanvasPreview.
export async function previewSuratPDF(
  surat: Pick<PrintableLetter, 'id'>,
  documentKey = MAIN_DOCUMENT,
) {
  const url = letterPdfUrl(surat, 'preview', documentKey)

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
