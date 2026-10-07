import api from '@/lib/api'

export function getGenderStats() {
  return api.get('/api/dashboard/gender-stats')
}

const ROLE_TO_PREFIX = {
  rt: 'rt',
  rw: 'rw',

  kepala_desa: 'kades',
  sekretaris_desa: 'kades',

  kasi: 'kasi',
  kasi_pelayanan: 'kasi',
  kaur_tu_umum: 'kasi',
  petugas_desa: 'kasi',
}

function resolvePrefix(role) {
  const prefix = ROLE_TO_PREFIX[role]

  if (!prefix) {
    throw new Error(`Role "${role}" tidak punya endpoint approval (bukan approver di v5.0)`)
  }

  return prefix
}

/**
 * Kirim keputusan approve/reject.
 *
 * Backend membutuhkan field:
 * {
 *   status: 'approved' | 'rejected',
 *   notes: string | null
 * }
 */
export const submitDecision = (role, id, status, notes = null) => {
  const prefix = resolvePrefix(role)

  if (prefix === 'rw') {
    throw new Error(
      'RW tidak pernah bisa approve/reject — endpoint decision tidak ada untuk role ini.',
    )
  }

  const url =
    prefix === 'kasi' ? `/api/kasi/letters/${id}` : `/api/${prefix}/letters/${id}/decision`

  return api.patch(url, {
    status,
    notes,
  })
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

export function getApprovalSettings() {
  return api.get('/api/approval-settings')
}

export function updateApprovalSetting(id, data) {
  return api.patch(`/api/approval-settings/${id}`, data)
}
