// ==========================================
// LetterRowActions.tsx
// Tombol aksi pada baris/kartu surat, dipakai semua peran:
// - "Proses" (primer) saat giliran pengguna memutuskan, selain itu
//   "Detail" (outline);
// - menu "Unduh" bila pengguna berhak mengunduh surat final;
// - `extra` untuk aksi tambahan (mis. Hapus milik pemohon).
// ==========================================

import '@/styles/surat-dokumen.css'
import { FileSearch, SquarePen } from 'lucide-react'

import type { ReactNode } from 'react'

import { DownloadSuratMenu } from '@/features/cetak-surat/components/DownloadSuratMenu'
import type { PrintableLetter } from '@/features/cetak-surat/utils/letterDocuments'
import { getLetterDetail } from '../api/letterExtrasApi'

// Baris daftar (LetterListItem) maupun detail surat.
type RowLetter = PrintableLetter & { applicant_name?: string | null }

type LetterRowActionsProps<T extends RowLetter> = {
  surat: T
  onOpen: (surat: T) => void
  // 'Proses' menampilkan tombol primer; selain itu tombol outline.
  openLabel?: string
  openAriaLabel?: string
  canDownload?: boolean
  downloadDisabled?: boolean
  downloadTitle?: string
  extra?: ReactNode
}

export function LetterRowActions<T extends RowLetter>({
  surat,
  onOpen,
  openLabel = 'Detail',
  openAriaLabel,
  canDownload = false,
  downloadDisabled = false,
  downloadTitle,
  extra = null,
}: LetterRowActionsProps<T>) {
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
