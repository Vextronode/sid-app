import api from '@/lib/api'
import type { Id, Letter, LetterDecision, MessageResponse, UserRole } from '@/types'

export function getGenderStats() {
  return api.get('/api/dashboard/gender-stats')
}

const ROLE_TO_PREFIX: Partial<Record<UserRole, string>> = {
  rt: 'rt',
  kepala_desa: 'kades',
  sekretaris_desa: 'kades',
}

function resolvePrefix(role: UserRole) {
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
export const submitDecision = (
  role: UserRole,
  id: Id,
  status: LetterDecision,
  notes: string | null = null,
) => {
  const prefix = resolvePrefix(role)

  return api.patch<MessageResponse<Letter>>(`/api/${prefix}/letters/${id}/decision`, {
    status,
    notes,
  })
}

// Respons PATCH keputusan; diteruskan ke onApprove/onReject pemanggil.
export type DecisionResponse = Awaited<ReturnType<typeof submitDecision>>

export function getApprovalSettings() {
  return api.get('/api/approval-settings')
}

export function updateApprovalSetting(id: Id, data: Record<string, unknown>) {
  return api.patch(`/api/approval-settings/${id}`, data)
}

// Alur persetujuan hanya dapat dibaca; alur dan step-nya diset developer.
export function getApprovalFlows() {
  return api.get('/api/approval-flows')
}

export function getApprovalFlow(id: Id) {
  return api.get(`/api/approval-flows/${id}`)
}
