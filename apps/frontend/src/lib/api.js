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
