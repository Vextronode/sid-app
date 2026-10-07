import { useAuth } from '@/features/auth/contexts/AuthContext'

import SuratDetailModal from '@/features/approval/components/SuratDetailModal'
import { useSuratDetail } from '../hooks/useSuratDetailKades'

export default function SuratDetailModalKades({ suratId, onClose }) {
  const { user } = useAuth()
  const { surat, notFound, refresh } = useSuratDetail(suratId)

  // ==========================================
  // CEK ID
  // ==========================================

  if (suratId === null) {
    return null
  }

  // ==========================================
  // APPROVER POSITION
  // ==========================================

  const isApplicantOfficial =
    surat &&
    (String(surat.submitted_by) === String(user?.id) ||
      (surat.citizen_id && String(surat.citizen_id) === String(user?.citizen_id)))
  const currentUserRole = !isApplicantOfficial ? user?.role : null

  const handleApprove = async (response) => {
    if (response) {
      await refresh()
    }
  }

  const handleReject = async (_notes, response) => {
    if (response) {
      await refresh()
    }
  }

  return (
    <SuratDetailModal
      suratId={suratId}
      onClose={onClose}
      surat={surat}
      notFound={notFound}
      subtitle="Tahap Final (Kades/Sekdes)"
      decisionLevels={[
        {
          levels: ['kepala_desa', 'sekdes'],
          title: 'Keputusan Tahap Final',
        },
      ]}
      showStatus
      currentUserRole={currentUserRole}
      apiRole={currentUserRole}
      onApprove={handleApprove}
      onReject={handleReject}
      onConflict={refresh}
      closeOnDecision={false}
      previewWhen="approved"
    />
  )
}
