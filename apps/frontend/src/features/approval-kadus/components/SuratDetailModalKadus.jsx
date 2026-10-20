import SuratDetailModal from '@/features/approval/components/SuratDetailModal'

import { useSuratDetailKadus } from '../hooks/useSuratDetailKadus'

export default function SuratDetailModalKadus({ suratId, onClose }) {
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
