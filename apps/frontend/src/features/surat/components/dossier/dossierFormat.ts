// Format bersama untuk panel berkas LetterDossierModal.
import type { LetterApproval } from '@/types'

export function formatDossierDateTime(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null
}

const LEVEL_LABELS: Record<string, string> = {
  rt: 'RT',
  rw: 'RW',
  kadus: 'Kepala Dusun',
  kepala_desa: 'Kepala Desa',
  sekretaris_desa: 'Sekretaris Desa',
}

export function formatApprovalLevel(level: string | null | undefined) {
  return (level ? LEVEL_LABELS[level] : undefined) ?? String(level ?? '').replace(/_/g, ' ')
}

export function getApprovalActor(
  approval: Partial<Pick<LetterApproval, 'approver_name' | 'approved_by_user'>> | null | undefined,
) {
  return approval?.approver_name ?? approval?.approved_by_user?.name ?? '-'
}
