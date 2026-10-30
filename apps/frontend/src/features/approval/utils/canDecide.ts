import type { UserRole } from '@/types'

// Apakah pengguna berhak memutus (setuju/tolak) surat pada tahap aktif.
// Dipakai ApprovalStepRenderer (menampilkan tombol) dan popup detail
// (hint footer), supaya keduanya selalu sepakat.

const APPROVER_ROLES_BY_POSITION: Record<string, UserRole[]> = {
  rt: ['rt'],
  kepala_desa: ['kepala_desa', 'sekretaris_desa'],
}

const APPROVAL_LEVELS_BY_POSITION: Record<string, string[]> = {
  rt: ['rt'],
  kepala_desa: ['kepala_desa', 'sekretaris_desa'],
}

export type CanDecideInput = {
  currentStep: { approver_position?: string } | null | undefined
  approvals?: { approval_level?: string; action?: string | null }[]
  letterStatus: string | null | undefined
  currentUserRole: UserRole | null | undefined
  apiRole: UserRole | null | undefined
}

export function canDecideOnLetter({
  currentStep,
  approvals = [],
  letterStatus,
  currentUserRole,
  apiRole,
}: CanDecideInput) {
  const position = currentStep?.approver_position
  const approverRoles = APPROVER_ROLES_BY_POSITION[position] ?? []
  const approvalLevels = APPROVAL_LEVELS_BY_POSITION[position] ?? []
  const hasExistingDecision = approvals.some(
    (approval) =>
      approvalLevels.includes(approval?.approval_level) &&
      ['approved', 'rejected'].includes(approval?.action),
  )
  // Tahap desa juga bisa berstatus pending bila tahap RT dilewati
  // (pemohon RT sendiri), sama seperti yang diterima backend.
  const isDecidable =
    (position === 'rt' || position === 'kepala_desa') &&
    (letterStatus === 'pending' || letterStatus === 'in_progress')

  return (
    isDecidable &&
    approverRoles.includes(currentUserRole) &&
    !hasExistingDecision &&
    Boolean(apiRole)
  )
}
