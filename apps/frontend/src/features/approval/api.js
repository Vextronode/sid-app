import api from '@/lib/api'

export function getGenderStats() {
  return api.get('/api/dashboard/gender-stats')
}

const ROLE_TO_PREFIX = {
  rt: 'rt',
  kepala_desa: 'kades',
  sekretaris_desa: 'kades',
}

function resolvePrefix(role) {
  const prefix = ROLE_TO_PREFIX[role]

  if (!prefix) {
    throw new Error(`Role "${role}" tidak punya endpoint keputusan surat.`)
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

  return api.patch(`/api/${prefix}/letters/${id}/decision`, {
    status,
    notes,
  })
}

export function getApprovalSettings() {
  return api.get('/api/approval-settings')
}

export function updateApprovalSetting(id, data) {
  return api.patch(`/api/approval-settings/${id}`, data)
}
