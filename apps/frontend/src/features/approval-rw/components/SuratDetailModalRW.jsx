import SuratDetailModal from '@/features/approval/components/SuratDetailModal'

import { useSuratDetail } from '../hooks/useSuratDetailRW'

export default function SuratDetailModalRW({ suratId, onClose }) {
  const { surat, notFound } = useSuratDetail(suratId)

  return (
    <SuratDetailModal
      suratId={suratId}
      onClose={onClose}
      surat={surat}
      notFound={notFound}
      subtitle="Riwayat surat wilayah RW"
      decisionLevels={[
        {
          levels: ['rt'],
          title: 'Keputusan RT',
        },
      ]}
    />
  )
}
