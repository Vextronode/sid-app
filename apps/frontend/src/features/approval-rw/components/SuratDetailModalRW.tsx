import SuratDetailModal from '@/features/approval/components/SuratDetailModal'
import type { Id } from '@/types'

import { useSuratDetail } from '../hooks/useSuratDetailRW'

export default function SuratDetailModalRW({
  suratId,
  onClose,
}: {
  suratId: Id | null
  onClose: () => void
}) {
  const { surat, notFound } = useSuratDetail(suratId)

  return (
    <SuratDetailModal
      suratId={suratId}
      onClose={onClose}
      surat={surat}
      notFound={notFound}
      viewerRole="rw"
    />
  )
}
