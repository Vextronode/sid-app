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
      subtitle="Surat warga"
      decisionLevels={[
        {
          levels: ['rt'],
          title: 'Keputusan RT',
        },
        {
          levels: ['kepala_desa', 'sekdes'],
          title: 'Keputusan Kepala Desa',
        },
      ]}
    />
  )
}
