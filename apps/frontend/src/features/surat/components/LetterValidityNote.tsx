import { RotateCcw } from 'lucide-react'

import { StatusPill } from '@/components/ui/StatusPill'
import type { Letter } from '@/types'

// Keterangan masa berlaku surat approved untuk pemohon. `expires_at`
// dicap saat final approve (akhir hari WIB); NULL berarti berlaku tanpa
// batas. Tanggal dibaca dalam WIB agar pemohon di WITA/WIT tidak melihat
// tanggal sehari lebih maju.
function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  })
}

type LetterValidityNoteProps = {
  surat: Partial<Pick<Letter, 'expires_at' | 'is_expired'>> | null | undefined
  // Tombol "Ajukan lagi" pada surat kedaluwarsa; tujuannya ditentukan
  // halaman pemakai (warga dan pejabat berbeda). Tanpa ini, tombol tidak tampil.
  onReapply?: () => void
}

export function LetterValidityNote({ surat, onReapply }: LetterValidityNoteProps) {
  if (!surat?.expires_at) {
    return null
  }

  if (surat.is_expired) {
    return (
      <div className="sid-letter-validity sid-letter-validity-expired" role="status">
        <StatusPill tone="danger">Kedaluwarsa</StatusPill>
        <p>
          Masa berlaku surat habis pada {formatDate(surat.expires_at)}. Surat hanya tersimpan
          sebagai riwayat dan tidak dapat diunduh lagi.
        </p>
        {onReapply && (
          <button type="button" className="sid-letter-validity-reapply" onClick={onReapply}>
            <RotateCcw size={14} aria-hidden="true" />
            Ajukan lagi
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="sid-letter-validity">
      <p>Berlaku sampai {formatDate(surat.expires_at)}</p>
    </div>
  )
}
