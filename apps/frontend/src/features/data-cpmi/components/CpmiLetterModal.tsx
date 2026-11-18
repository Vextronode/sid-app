import SuratDetailModal from '@/features/approval/components/SuratDetailModal'
import { useSuratDetail } from '@/features/approval/hooks/useSuratDetail'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import type { Id } from '@/types'

/**
 * Pop up rincian pengajuan CPMI dari daftar Data CPMI: modal yang sama
 * dengan yang dilihat RT/Kepala Desa saat menyetujui (rincian isian per
 * section, 10 dokumen, tahapan), dalam mode lihat saja.
 */
export function CpmiLetterModal({
  letterId,
  onClose,
}: {
  letterId: Id | null
  onClose: () => void
}) {
  const { user } = useAuth()
  const { surat, notFound } = useSuratDetail(letterId)

  return (
    <SuratDetailModal
      suratId={letterId}
      onClose={onClose}
      surat={surat}
      notFound={notFound}
      viewerRole={user?.role ?? null}
    />
  )
}
