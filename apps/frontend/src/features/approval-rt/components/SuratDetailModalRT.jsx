import { useAuth } from '@/features/auth/contexts/AuthContext'

import SuratDetailModal from '@/features/approval/components/SuratDetailModal'
import { useSuratDetail } from '../hooks/useSuratDetail'

export default function SuratDetailModalRT({
  suratId,
  onClose,
  onApprove,
  onReject,
  readOnly = false,
}) {
  const { user } = useAuth()
  const { surat, notFound } = useSuratDetail(suratId)

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
  const currentUserRole = !readOnly && !isApplicantOfficial ? user?.role : null

  return (
    <SuratDetailModal
      suratId={suratId}
      onClose={onClose}
      surat={surat}
      notFound={notFound}
      subtitle="Surat masuk RT"
      decisionLevels={[
        {
          levels: ['rt'],
          title: 'Keputusan RT',
        },
      ]}
      currentUserRole={currentUserRole}
      apiRole={currentUserRole}
      onApprove={onApprove}
      onReject={onReject}
    />
  )
}
