// ==========================================
// generateSuratPDF.js
// Generate PDF surat dari backend seeder template
// ==========================================

import { responseError, userFacingError } from '@/shared/lib/apiError'

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

  downloadLink.href = blobUrl
  downloadLink.download = `surat-${letterNumber}.pdf`
  document.body.appendChild(downloadLink)
  downloadLink.click()
  downloadLink.remove()

  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000)
}

// buka file PDF dari backend
export async function generateSuratPDF(surat, template = 'wet') {
  const url = `${apiUrl()}/api/letters/${surat.id}/download?template=${template}`

  // Buka tab SEBELUM await agar tidak diblokir browser
  const pdfTab = window.open('', '_blank')

  if (!pdfTab) {
    throw userFacingError(
      'Jendela baru diblokir browser. Izinkan pop-up untuk situs ini lalu coba lagi.',
    )
  }

  try {
    pdfTab.document.write(`
      <html>
        <head>
          <title>Memproses Surat...</title>
        </head>
        <body style="
          font-family: Arial, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        ">
          <p>Memproses surat...</p>
        </body>
      </html>
    `)

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/pdf',
      },
    })

    if (!response.ok) {
      throw await responseError(response, 'Gagal membuka surat.')
    }

    const blob = await response.blob()
    const blobUrl = window.URL.createObjectURL(blob)

    pdfTab.location.href = blobUrl

    // Jangan revoke terlalu cepat
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl)
    }, 60000)

    return true
  } catch (error) {
    pdfTab.close()
    throw error
  }
}

// Preview PDF di tab baru dari backend
export async function previewSuratPDF(surat, template = 'wet') {
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
