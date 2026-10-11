import axios from 'axios'

import { queryClient } from '@/shared/lib/queryClient'
import { queryKeys } from '@/shared/lib/queryKeys'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || window.location.origin,
  withCredentials: true,
  withXSRFToken: true,

  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// Akun dengan kata sandi sementara ditolak backend (403
// password_change_required) di semua endpoint selain ganti kata sandi.
// Arahkan ke halaman ganti kata sandi bila sesi di FE belum mengetahuinya.
const PASSWORD_CHANGE_PATH = '/ganti-password'

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === 'password_change_required' &&
      typeof window !== 'undefined' &&
      window.location.pathname !== PASSWORD_CHANGE_PATH
    ) {
      window.location.assign(PASSWORD_CHANGE_PATH)
    }

    return Promise.reject(error)
  },
)

// ======================================================
// GET DETAIL SURAT
// Endpoint generic:
// GET /api/letters/{id}
// Scope ditentukan backend berdasarkan user / role / wilayah
// ======================================================
export function getSuratDetail(id) {
  return api.get(`/api/letters/${id}`)
}

// ======================================================
// RT / kades / sekdes
// Endpoint : /decision
// ======================================================
export async function submitDecision(role, id, status, notes = null) {
  const response = await api.patch(`/api/${role}/letters/${id}/decision`, {
    status,
    notes,
  })

  // Keputusan mengubah daftar dan angka dashboard di semua halaman surat.
  queryClient.invalidateQueries({ queryKey: queryKeys.surat.all })

  return response
}

export default api
