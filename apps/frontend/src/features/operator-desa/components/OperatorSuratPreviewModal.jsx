// ==========================================
// OperatorSuratPreviewModal.jsx
// Detail surat untuk Kasi/Kaur dan Petugas Desa (read-only), di atas
// kerangka LetterDossierModal: surat di kiri, berkas di kanan, menu
// "Unduh surat" (digital / tanda tangan basah) di footer.
// ==========================================

import { useEffect, useState } from 'react'
import { FileClock } from 'lucide-react'

import { getSuratDetail } from '@/lib/api'
import { LetterExtrasPanel } from '@/features/surat/components/LetterExtrasPanel'
import { LetterDocumentsPreview } from '@/features/cetak-surat/components/LetterDocumentsPreview'
import { DownloadSuratMenu } from '@/features/cetak-surat/components/DownloadSuratMenu'
import {
  DossierDocumentEmpty,
  LetterDossierModal,
} from '@/features/surat/components/dossier/LetterDossierModal'
import {
  ApprovalTimeline,
  DossierFacts,
  DossierQuote,
  DossierSection,
} from '@/features/surat/components/dossier/DossierParts'
import { formatDossierDateTime } from '@/features/surat/components/dossier/dossierFormat'
import { getApplicantAddress, getApplicantNik } from '@/features/surat/utils/letterDetails'
import { SURAT_STATUS } from '@/constants/suratStatus'
import {
  FORM_DOWNLOAD_HINT,
  isSignedByVillageHead,
} from '@/features/cetak-surat/utils/letterSigning'
import { RevealableValue } from '@/components/ui/RevealableValue'
import { revealLetterApplicantNik } from '@/shared/lib/identityApi'

export default function OperatorSuratPreviewModal({ surat: listedSurat, onClose }) {
  const [surat, setSurat] = useState(null)
  const [detailLoading, setDetailLoading] = useState(true)
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    if (!listedSurat?.id) return

    let isMounted = true

    const loadDetail = async () => {
      try {
        setDetailLoading(true)
        setDetailError('')
        setSurat(null)
        const response = await getSuratDetail(listedSurat.id)
        const detail = response.data?.data
        if (!detail) {
          throw new Error('Respons detail surat tidak berisi data.')
        }
        if (isMounted) setSurat(detail)
      } catch (error) {
        if (isMounted) {
          console.error('Gagal mengambil detail surat operator:', error.response?.data ?? error)
          setDetailError(error.response?.data?.message ?? 'Gagal mengambil detail surat.')
        }
      } finally {
        if (isMounted) setDetailLoading(false)
      }
    }

    loadDetail()

    return () => {
      isMounted = false
    }
  }, [listedSurat?.id])

  const isApproved = surat?.status === SURAT_STATUS.APPROVED

  return (
    <LetterDossierModal
      surat={surat ?? (detailLoading ? listedSurat : null)}
      loading={detailLoading}
      error={detailError}
      onClose={onClose}
      preview={
        isApproved ? (
          <LetterDocumentsPreview surat={surat} />
        ) : (
          <DossierDocumentEmpty icon={FileClock} title="Surat belum selesai disetujui.">
            Pratinjau dan unduhan tersedia setelah persetujuan final Kepala Desa.
          </DossierDocumentEmpty>
        )
      }
      hint={
        !isApproved
          ? 'Surat dapat diunduh setelah disetujui.'
          : isSignedByVillageHead(surat)
            ? 'Pilih format saat mengunduh: digital atau untuk tanda tangan basah.'
            : FORM_DOWNLOAD_HINT
      }
      actions={
        <>
          <button type="button" className="sid-dossier-button-quiet" onClick={onClose}>
            Tutup
          </button>
          {isApproved && <DownloadSuratMenu surat={surat} />}
        </>
      }
    >
      {surat && (
        <>
          <DossierSection title="Pemohon">
            <DossierFacts
              items={[
                { label: 'Nama', value: surat.applicant_name ?? surat.citizen?.name },
                {
                  label: 'NIK',
                  value: (
                    <RevealableValue
                      masked={getApplicantNik(surat)}
                      reveal={() => revealLetterApplicantNik(surat.id)}
                    />
                  ),
                },
                { label: 'Alamat', value: getApplicantAddress(surat) },
                { label: 'Keperluan', value: surat.purpose },
                { label: 'Diajukan', value: formatDossierDateTime(surat.submitted_at) },
              ]}
            />
          </DossierSection>

          {surat.notes && (
            <DossierSection title="Catatan pemohon">
              <DossierQuote>{surat.notes}</DossierQuote>
            </DossierSection>
          )}

          <DossierSection title="Riwayat persetujuan">
            <ApprovalTimeline approvals={surat.approvals ?? []} />
          </DossierSection>

          <div className="sid-dossier-extras">
            <LetterExtrasPanel letterId={surat.id} />
          </div>
        </>
      )}
    </LetterDossierModal>
  )
}
