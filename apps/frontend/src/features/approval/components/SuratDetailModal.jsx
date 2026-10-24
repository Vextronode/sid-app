// ==========================================
// SuratDetailModal.jsx
// Popup detail surat untuk approver dan pemantau wilayah (RT, RW, Kadus,
// Kades/Sekdes) di atas kerangka LetterDossierModal.
//
// Isi menyesuaikan peran:
// - pratinjau draf untuk semua status (backend hanya memasang TTD &
//   stempel pada surat final bagi pihak yang berhak mengunduh);
// - Setuju/Tolak di footer hanya bila pengguna berwenang di tahap aktif;
// - menu Unduh hanya bila `canDownload` (Kades/Sekdes) dan surat final.
// ==========================================

import { DownloadSuratMenu } from '@/features/cetak-surat/components/DownloadSuratMenu'
import { LetterDocumentsPreview } from '@/features/cetak-surat/components/LetterDocumentsPreview'
import { LetterExtrasPanel } from '@/features/surat/components/LetterExtrasPanel'
import { LetterDossierModal } from '@/features/surat/components/dossier/LetterDossierModal'
import {
  DossierFacts,
  DossierQuote,
  DossierSection,
} from '@/features/surat/components/dossier/DossierParts'
import { formatDossierDateTime } from '@/features/surat/components/dossier/dossierFormat'
import { FlowTimeline } from '@/features/surat/components/dossier/FlowTimeline'
import { getApplicantAddress, getApplicantNik } from '@/features/surat/utils/letterDetails'
import { getLatestApprovalForLevel } from '@/features/approval/constants/statusFlow'
import { SURAT_STATUS } from '@/constants/suratStatus'

import ApprovalStepRenderer from './ApprovalStepRenderer'
import { canDecideOnLetter } from '../utils/canDecide'
import {
  FORM_DOWNLOAD_HINT,
  isSignedByVillageHead,
} from '@/features/cetak-surat/utils/letterSigning'

// Peran yang hanya memantau surat di wilayahnya, tanpa memberi keputusan.
const MONITOR_ROLES = ['rw', 'kadus']

function getRejectionReason(surat) {
  const rejection = getLatestApprovalForLevel(
    (surat?.approvals ?? []).filter((approval) => approval?.action === 'rejected'),
    ['rt', 'kepala_desa', 'sekretaris_desa'],
  )

  return rejection?.notes ?? surat?.notes ?? null
}

function getHint({ surat, canDecide, canDownload, viewerRole }) {
  if (canDecide) {
    if (!surat.current_step?.is_final) {
      return 'Periksa surat, lalu setujui untuk meneruskan ke Kepala Desa atau tolak dengan alasan.'
    }

    return isSignedByVillageHead(surat)
      ? 'Persetujuan Anda menerbitkan surat dengan tanda tangan dan stempel desa.'
      : 'Persetujuan Anda menerbitkan formulir untuk instansi luar, tanpa nomor surat dan tanpa tanda tangan Kepala Desa.'
  }

  if (surat.status === SURAT_STATUS.APPROVED) {
    if (!canDownload) return 'Surat sudah terbit.'

    return isSignedByVillageHead(surat)
      ? 'Surat sudah terbit. Pilih format saat mengunduh: digital atau untuk tanda tangan basah.'
      : `Formulir sudah terbit. ${FORM_DOWNLOAD_HINT}`
  }

  if (surat.status === SURAT_STATUS.REJECTED) {
    return 'Surat ini ditolak. Pemohon dapat mengajukan ulang setelah memperbaikinya.'
  }

  if (MONITOR_ROLES.includes(viewerRole)) {
    return 'Anda memantau surat di wilayah Anda. Keputusan ada di RT dan Kepala Desa.'
  }

  return 'Surat sedang menunggu keputusan di tahap lain.'
}

export default function SuratDetailModal({
  suratId,
  onClose,
  surat,
  notFound,
  viewerRole = null,
  currentUserRole = null,
  apiRole = null,
  onApprove,
  onReject,
  onConflict,
  closeOnDecision = true,
  showPreview = true,
  canDownload = false,
}) {
  if (suratId === null) {
    return null
  }

  const canDecide = surat
    ? canDecideOnLetter({
        currentStep: surat.current_step,
        approvals: surat.approvals,
        letterStatus: surat.status,
        currentUserRole,
        apiRole,
      })
    : false
  const isApproved = surat?.status === SURAT_STATUS.APPROVED
  const isRejected = surat?.status === SURAT_STATUS.REJECTED
  const rejectionReason = isRejected ? getRejectionReason(surat) : null

  return (
    <LetterDossierModal
      surat={surat}
      notFound={notFound}
      onClose={onClose}
      preview={showPreview && surat ? <LetterDocumentsPreview surat={surat} /> : null}
      hint={surat ? getHint({ surat, canDecide, canDownload, viewerRole }) : null}
      actions={
        canDecide ? (
          <ApprovalStepRenderer
            currentStep={surat.current_step}
            approvals={surat.approvals}
            letterStatus={surat.status}
            currentUserRole={currentUserRole}
            apiRole={apiRole}
            letterId={surat.id}
            onApprove={onApprove}
            onReject={onReject}
            onConflict={onConflict}
            onClose={onClose}
            closeOnDecision={closeOnDecision}
          />
        ) : (
          <>
            <button type="button" className="sid-dossier-button-quiet" onClick={onClose}>
              Tutup
            </button>
            {canDownload && isApproved && <DownloadSuratMenu surat={surat} />}
          </>
        )
      }
    >
      {surat && (
        <>
          {isRejected && rejectionReason && (
            <DossierSection title="Alasan penolakan">
              <DossierQuote tone="danger">{rejectionReason}</DossierQuote>
            </DossierSection>
          )}

          <DossierSection title="Pemohon">
            <DossierFacts
              items={[
                { label: 'Nama', value: surat.applicant_name ?? surat.citizen?.name },
                { label: 'NIK', value: getApplicantNik(surat) },
                { label: 'Alamat', value: getApplicantAddress(surat) },
                { label: 'Keperluan', value: surat.purpose },
                { label: 'Diajukan', value: formatDossierDateTime(surat.submitted_at) },
              ]}
            />
          </DossierSection>

          {!isRejected && surat.notes && (
            <DossierSection title="Catatan pemohon">
              <DossierQuote>{surat.notes}</DossierQuote>
            </DossierSection>
          )}

          <DossierSection title="Tahapan">
            <FlowTimeline surat={surat} />
          </DossierSection>

          <div className="sid-dossier-extras">
            <LetterExtrasPanel letterId={surat.id} />
          </div>
        </>
      )}
    </LetterDossierModal>
  )
}
