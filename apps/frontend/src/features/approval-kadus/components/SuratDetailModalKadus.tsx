import SuratDetailModal from '@/features/approval/components/SuratDetailModal'
import type { Id } from '@/types'

import { useSuratDetail } from '@/features/approval/hooks/useSuratDetail'

export default function SuratDetailModalKadus({
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
      viewerRole="kadus"
    />
  )
}
