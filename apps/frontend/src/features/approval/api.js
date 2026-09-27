import api from '@/lib/api'

export function getGenderStats() {
  return api.get('/api/dashboard/gender-stats')
}

const ROLE_TO_PREFIX = {
  rt: 'rt',
  kepala_desa: 'kades',
  sekretaris_desa: 'kades',
  kasi_pelayanan: 'kasi',
  kaur_tu_umum: 'kasi',
  rw: 'rw',
}

function resolvePrefix(role) {
  const prefix = ROLE_TO_PREFIX[role]
  if (!prefix) {
    throw new Error(`Role "${role}" tidak punya endpoint approval (bukan approver di v5.0)`)
  }
  return prefix
}

/**
 * Mengambil daftar surat sesuai role approver.
 *   - rt    -> /api/rt/letters
 *   - kades -> /api/kades/letters   (Kepala Desa & Sekretaris Desa, saling menggantikan)
 *   - kasi  -> /api/kasi/letters    (Kasi Pelayanan & Kaur TU Umum, step final)
 *   - rw    -> /api/rw/letters      (READ-ONLY, tidak pernah approve)
 */
export const getSuratList = (role, params = {}) =>
  api.get(`/api/${resolvePrefix(role)}/letters`, { params })

/**
 * Mengambil detail surat berdasarkan ID dan role.
 */
export const getSuratDetail = (id, role) => api.get(`/api/${resolvePrefix(role)}/letters/${id}`)

/**
 * Kirim keputusan approve/reject.
 */
export const submitDecision = (role, id, action, notes = null) => {
  const prefix = resolvePrefix(role)

  if (prefix === 'rw') {
    throw new Error(
      'RW tidak pernah bisa approve/reject — endpoint decision tidak ada untuk role ini.',
    )
  }

  const url =
    prefix === 'kasi' ? `/api/kasi/letters/${id}` : `/api/${prefix}/letters/${id}/decision`

  return api.patch(url, { action, notes })
}

/**
 * Wrapper keputusan surat dengan validasi status backend v5.0.
 */
export const approveSurat = (role, id, status, notes = null) => {
  if (status !== 'approved' && status !== 'rejected') {
    throw new Error(
      `Status "${status}" tidak didukung backend v5.0. Hanya 'approved' atau 'rejected' yang valid.`,
    )
  }
  return submitDecision(role, id, status, notes)
}
