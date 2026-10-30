import api from '@/lib/api'

type QueryParams = Record<string, string | number | undefined>

// Berkas yang dilindungi sesi login (ekspor laporan, template Excel, lampiran
// dan dokumen surat) diambil sebagai blob lewat klien API, lalu dibuka atau
// disimpan dari object URL.
async function fetchBlobUrl(url: string, params?: QueryParams) {
  const response = await api.get<Blob>(url, { params, responseType: 'blob' })

  return URL.createObjectURL(response.data)
}

// Simpan berkas dengan nama `filename`.
export async function downloadFile(url: string, filename: string, params?: QueryParams) {
  const blobUrl = await fetchBlobUrl(url, params)
  const link = document.createElement('a')

  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(blobUrl)
}

// Buka berkas di tab baru.
export async function openProtectedFile(url: string, params?: QueryParams) {
  const blobUrl = await fetchBlobUrl(url, params)

  window.open(blobUrl, '_blank', 'noopener')
  // Beri waktu tab baru memuat berkas sebelum URL dilepas.
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
}

// Dengan responseType 'blob', body error JSON ikut datang sebagai Blob;
// baca dulu teksnya agar pesan dari backend bisa ditampilkan.
export async function downloadErrorMessage(error: unknown, fallback: string): Promise<string> {
  const data = (error as { response?: { data?: unknown } })?.response?.data

  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text())?.message || fallback
    } catch {
      return fallback
    }
  }

  return (data as { message?: string } | undefined)?.message || fallback
}
