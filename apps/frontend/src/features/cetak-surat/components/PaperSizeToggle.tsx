// ==========================================
// PaperSizeToggle.tsx
// Pilihan A4 | F4 untuk unduhan dan pratinjau PDF. Di dalam menu unduh
// (role="menu") tiap pilihan berperan menuitemradio agar ikut navigasi
// panah menu; di luar menu berperan radio.
// ==========================================

import '@/styles/surat-dokumen.css'
import { useId } from 'react'

import { PAPER_OPTIONS } from '@/features/cetak-surat/utils/paperSize'
import type { PaperSize } from '@/types'

type PaperSizeToggleProps = {
  value: PaperSize
  onChange: (paper: PaperSize) => void
  label?: string
  inMenu?: boolean
  className?: string
}

export function PaperSizeToggle({
  value,
  onChange,
  label = 'Ukuran kertas',
  inMenu = false,
  className = '',
}: PaperSizeToggleProps) {
  const labelId = useId()

  return (
    <div className={`sid-paper-toggle ${className}`}>
      <span id={labelId} className="sid-paper-toggle-label">
        {label}
      </span>
      <div
        role={inMenu ? 'group' : 'radiogroup'}
        aria-labelledby={labelId}
        className="sid-paper-toggle-options"
      >
        {PAPER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role={inMenu ? 'menuitemradio' : 'radio'}
            aria-checked={value === option.value}
            title={option.hint}
            className="sid-paper-toggle-option"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
