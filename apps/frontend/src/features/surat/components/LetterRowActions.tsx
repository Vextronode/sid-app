// ==========================================
// LetterRowActions.jsx
// Tombol aksi pada baris/kartu surat, dipakai semua peran:
// - "Proses" (primer) saat giliran pengguna memutuskan, selain itu
//   "Detail" (outline);
// - menu "Unduh" bila pengguna berhak mengunduh surat final;
// - `extra` untuk aksi tambahan (mis. Hapus milik pemohon).
// ==========================================

import '@/styles/surat-dokumen.css'
import { FileSearch, SquarePen } from 'lucide-react'

import { DownloadSuratMenu } from '@/features/cetak-surat/components/DownloadSuratMenu'
import { getLetterDetail } from '../api/letterExtrasApi'

export function LetterRowActions({
  surat,
  onOpen,
  openLabel = 'Detail',
  openAriaLabel,
  canDownload = false,
  downloadDisabled = false,
  downloadTitle,
  extra = null,
}) {
  const isProcess = openLabel === 'Proses'
  const Icon = isProcess ? SquarePen : FileSearch
  const subject = [surat?.letter_number, surat?.applicant_name ?? surat?.letter_type?.name]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="sid-row-actions">
      <button
        type="button"
        onClick={() => onOpen(surat)}
        className={`sid-row-action${isProcess ? ' primary' : ''}`}
        aria-label={
          openAriaLabel ?? `${isProcess ? 'Proses' : 'Lihat detail'} surat ${subject}`.trim()
        }
      >
        <Icon size={16} aria-hidden="true" />
        {openLabel}
      </button>

      {canDownload && (
        <DownloadSuratMenu
          surat={surat}
          label="Unduh"
          variant="compact"
          disabled={downloadDisabled}
          title={downloadTitle}
          // Baris tabel tidak membawa daftar dokumen terbitan.
          loadDetail={getLetterDetail}
        />
      )}

      {extra}
    </div>
  )
}
