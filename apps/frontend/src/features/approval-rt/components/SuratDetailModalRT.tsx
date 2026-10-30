import { useAuth } from '@/features/auth/contexts/AuthContext'

import SuratDetailModal from '@/features/approval/components/SuratDetailModal'
import type { DecisionResponse } from '@/features/approval/api'
import type { Id } from '@/types'
import { useSuratDetail } from '../hooks/useSuratDetail'

export default function SuratDetailModalRT({
  suratId,
  onClose,
  onApprove,
  onReject,
  readOnly = false,
}: {
  suratId: Id | null
  onClose: () => void
  onApprove?: (response: DecisionResponse) => unknown
  onReject?: (notes: string, response: DecisionResponse) => unknown
  // Tampilan saja: tanpa tombol keputusan.
  readOnly?: boolean
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
      viewerRole="rt"
      currentUserRole={currentUserRole}
      apiRole={currentUserRole}
      onApprove={onApprove}
      onReject={onReject}
    />
  )
}
