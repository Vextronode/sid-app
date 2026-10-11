import axios from 'axios'

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
// GET LIST SURAT
// Endpoint generic:
// GET /api/letters
// Scope ditentukan backend berdasarkan user / role / wilayah
// ======================================================
export function getSuratList() {
  return api.get('/api/letters')
}

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
export function submitDecision(role, id, status, notes = null) {
  return api.patch(`/api/${role}/letters/${id}/decision`, {
    status,
    notes,
  })
}

export default api
