import api from '@/lib/api'

// Unduh berkas yang dilindungi sesi login (ekspor laporan, template Excel):
// diambil sebagai blob lewat klien API lalu disimpan dengan nama `filename`.
export async function downloadFile(
  url: string,
  filename: string,
  params?: Record<string, string | number | undefined>,
) {
  const response = await api.get<Blob>(url, { params, responseType: 'blob' })
  const blobUrl = URL.createObjectURL(response.data)
  const link = document.createElement('a')

  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(blobUrl)
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
