// ==========================================
// DetailSuratModal.jsx
// Popup detail surat milik pemohon sendiri (warga, atau pejabat di
// "Surat Saya"), di atas kerangka LetterDossierModal.
//
// Pemohon hanya melihat status generik: progres tanpa nama pejabat,
// alasan penolakan, masa berlaku, dan pratinjau setelah surat terbit.
// Unduhan lewat menu "Unduh surat" (digital / tanda tangan basah).
// ==========================================

import { useQuery } from '@tanstack/react-query'
import { CalendarX, FileX, Hourglass } from 'lucide-react'

import { DownloadSuratMenu } from '@/features/cetak-surat/components/DownloadSuratMenu'
import { PdfCanvasPreview } from '@/features/cetak-surat/components/PdfCanvasPreview'
import { queryKeys } from '@/shared/lib/queryKeys'
import { SURAT_STATUS } from '@/constants/suratStatus'

import { LetterExtrasPanel } from './LetterExtrasPanel'
import { LetterValidityNote } from './LetterValidityNote'
import { DossierDocumentEmpty, LetterDossierModal } from './dossier/LetterDossierModal'
import { DossierFacts, DossierQuote, DossierSection } from './dossier/DossierParts'
import { formatDossierDateTime } from './dossier/dossierFormat'
import { FlowTimeline } from './dossier/FlowTimeline'
import { getLetterDetail } from '../api/letterExtrasApi'
import { getApplicantAddress, getApplicantNik } from '../utils/letterDetails'

function getRejectionReason(surat) {
  return surat?.notes ?? surat?.reason ?? surat?.rejection_reason ?? 'Tidak ada catatan penolakan.'
}

function getLetterState(surat) {
  if (surat?.status === SURAT_STATUS.APPROVED) {
    return surat.is_expired === true ? 'expired' : 'approved'
  }

  return surat?.status === SURAT_STATUS.REJECTED ? 'rejected' : 'processing'
}

const HINTS = {
  approved: 'Pilih format saat mengunduh: digital (siap dipakai) atau untuk tanda tangan basah.',
  expired: 'Masa berlaku surat sudah habis, jadi surat tidak dapat diunduh lagi.',
  rejected: 'Perbaiki permohonan sesuai alasan penolakan, lalu ajukan ulang.',
  processing: 'Anda akan mendapat notifikasi setiap kali status surat berubah.',
}

function DocumentArea({ surat, state }) {
  if (state === 'approved') {
    return <PdfCanvasPreview surat={surat} />
  }

  if (state === 'expired') {
    return (
      <DossierDocumentEmpty icon={CalendarX} title="Masa berlaku surat telah habis.">
        Surat hanya tersimpan sebagai riwayat dan tidak dapat dipratinjau atau diunduh lagi.
      </DossierDocumentEmpty>
    )
  }

  if (state === 'rejected') {
    return (
      <DossierDocumentEmpty icon={FileX} title="Permohonan ditolak.">
        Lihat alasan penolakan di samping, perbaiki permohonan, lalu ajukan ulang.
      </DossierDocumentEmpty>
    )
  }

  return (
    <DossierDocumentEmpty icon={Hourglass} title="Surat sedang diproses.">
      Pratinjau dan unduhan tersedia setelah Kepala Desa menyetujui surat ini.
    </DossierDocumentEmpty>
  )
}

export function DetailSuratModal({ data, onClose }) {
  if (!data) {
    return null
  }

  return <DetailSuratModalContent row={data} onClose={onClose} />
}

function DetailSuratModalContent({ row, onClose }) {
  // Baris daftar hanya memuat kolom ringkas; NIK, alamat, dan keperluan
  // dilengkapi dari detail surat begitu tersedia.
  const { data: detail } = useQuery({
    queryKey: queryKeys.surat.detail(row.id),
    queryFn: () => getLetterDetail(row.id),
  })

  const surat = detail ? { ...row, ...detail } : row
  const state = getLetterState(surat)
  const isApproved = surat.status === SURAT_STATUS.APPROVED

  return (
    <LetterDossierModal
      surat={surat}
      onClose={onClose}
      preview={<DocumentArea surat={surat} state={state} />}
      hint={HINTS[state]}
      actions={
        <>
          <button type="button" className="sid-dossier-button-quiet" onClick={onClose}>
            Tutup
          </button>
          {isApproved && (
            <DownloadSuratMenu
              surat={surat}
              disabled={state === 'expired'}
              title={state === 'expired' ? 'Masa berlaku surat telah habis' : undefined}
            />
          )}
        </>
      }
    >
      {state === 'rejected' && (
        <DossierSection title="Alasan penolakan">
          <DossierQuote tone="danger">{getRejectionReason(surat)}</DossierQuote>
        </DossierSection>
      )}

      {isApproved && surat.expires_at && (
        <DossierSection title="Masa berlaku">
          <LetterValidityNote surat={surat} />
        </DossierSection>
      )}

      <DossierSection title="Progres">
        <FlowTimeline surat={surat} variant="generic" />
      </DossierSection>

      <DossierSection title="Detail surat">
        <DossierFacts
          items={[
            { label: 'Pemohon', value: surat.applicant_name },
            { label: 'NIK', value: getApplicantNik(surat) },
            { label: 'Alamat', value: getApplicantAddress(surat) },
            { label: 'Keperluan', value: surat.purpose },
            { label: 'Diajukan', value: formatDossierDateTime(surat.submitted_at) },
            { label: 'Diperbarui', value: formatDossierDateTime(surat.updated_at) },
          ]}
        />
      </DossierSection>

      <div className="sid-dossier-extras">
        <LetterExtrasPanel letterId={surat.id} />
      </div>
    </LetterDossierModal>
  )
}
