import SuratDetailModal from '@/features/approval/components/SuratDetailModal'
import type { Id } from '@/types'

import { useSuratDetailKadus } from '../hooks/useSuratDetailKadus'

export default function SuratDetailModalKadus({
  suratId,
  onClose,
}: {
  suratId: Id | null
  onClose: () => void
}) {
  const { surat, notFound } = useSuratDetailKadus(suratId)

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
