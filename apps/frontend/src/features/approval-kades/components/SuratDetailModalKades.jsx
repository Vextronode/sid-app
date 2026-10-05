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
  const approverPosition =
    !isApplicantOfficial &&
    surat?.current_step?.approver_position === 'kepala_desa' &&
    (user?.role === 'kepala_desa' || user?.role === 'sekretaris_desa')
      ? 'kepala_desa'
      : null

  const handleApprove = async (response) => {
    if (response) {
      await refresh()
    }
  }

  const handleReject = async (notes, response) => {
    if (notes || response) {
      await refresh()
    }

    onClose()
  }

  return (
    <SuratDetailModal
      suratId={suratId}
      onClose={onClose}
      surat={surat}
      notFound={notFound}
      subtitle="Kepala Desa"
      decisionLevels={[
        {
          levels: ['kepala_desa', 'sekdes'],
          title: 'Keputusan Kepala Desa',
        },
      ]}
      showStatus
      approverPosition={approverPosition}
      currentUserRole={approverPosition}
      apiRole="kepala_desa"
      onApprove={handleApprove}
      onReject={handleReject}
      previewWhen="approved"
    />
  )
}
