import axios from 'axios'

import { ROLE_FORBIDDEN_EVENT } from '@/lib/authEvents'
import type { ApiError, Id, Letter, MessageResponse } from '@/types'

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
const PASSWORD_CHANGE_PATH = '/change-password'

api.interceptors.response.use(
  (response) => response,
  (error: ApiError) => {
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === 'role_forbidden' &&
      typeof window !== 'undefined'
    ) {
      window.dispatchEvent(new Event(ROLE_FORBIDDEN_EVENT))
    }

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
export function getSuratDetail(id: Id) {
  return api.get<MessageResponse<Letter>>(`/api/letters/${id}`)
}

export default api
