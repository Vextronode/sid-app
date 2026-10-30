import api from '@/lib/api'

// Isian halaman informasi publik (PPID, Kebijakan Privasi, Aksesibilitas),
// khusus Staf SIDUTama. Respons memuat skema field per halaman.
export function getInfoPages() {
  return api.get('/api/info-pages')
}

export function saveInfoPage(page: string, fields: Record<string, unknown>) {
  return api.put(`/api/info-pages/${page}`, fields)
}
