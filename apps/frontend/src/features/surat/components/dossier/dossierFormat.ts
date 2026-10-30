// Format bersama untuk panel berkas LetterDossierModal.

export function formatDossierDateTime(value) {
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

const LEVEL_LABELS = {
  rt: 'RT',
  rw: 'RW',
  kadus: 'Kepala Dusun',
  kepala_desa: 'Kepala Desa',
  sekretaris_desa: 'Sekretaris Desa',
}

export function formatApprovalLevel(level) {
  return LEVEL_LABELS[level] ?? String(level ?? '').replace(/_/g, ' ')
}

export function getApprovalActor(approval) {
  return (
    approval?.approver_name ??
    approval?.approved_by_user?.name ??
    approval?.approvedBy?.name ??
    approval?.actor_name ??
    '-'
  )
}
