import { useAuth } from '@/features/auth/contexts/AuthContext'

import SuratDetailModal from '@/features/approval/components/SuratDetailModal'
import type { DecisionResponse } from '@/features/approval/api'
import type { Id } from '@/types'
import { useSuratDetail } from '@/features/approval/hooks/useSuratDetail'

export default function SuratDetailModalKades({
  suratId,
  onClose,
}: {
  suratId: Id | null
  onClose: () => void
}) {
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

  const handleApprove = async (response: DecisionResponse) => {
    if (response) {
      await refresh()
    }
  }

  const handleReject = async (_notes: string, response: DecisionResponse) => {
    if (response) {
      await refresh()
    }
  }

  // Kades/Sekdes berhak mengunduh surat final desanya (LetterPolicy::download).
  return (
    <SuratDetailModal
      suratId={suratId}
      onClose={onClose}
      surat={surat}
      notFound={notFound}
      viewerRole={user?.role}
      currentUserRole={currentUserRole}
      apiRole={currentUserRole}
      onApprove={handleApprove}
      onReject={handleReject}
      onConflict={refresh}
      closeOnDecision={false}
      canDownload
    />
  )
}
