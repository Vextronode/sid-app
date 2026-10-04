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

  const approverPosition = !readOnly && user?.role === 'rt' ? 'rt' : null

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
      approverPosition={approverPosition}
      currentUserRole={approverPosition}
      apiRole="rt"
      onApprove={onApprove}
      onReject={onReject}
    />
  )
}
