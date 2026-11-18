// ==========================================
// paperSize.ts
// Pilihan ukuran kertas saat mengunduh/pratinjau PDF (?paper=a4|f4). Backend
// merender di kertas bawaan template lalu menskalakan tiap halaman utuh ke
// kertas yang dipilih, jadi tampilannya sama dan hanya ukurannya yang berubah.
// Bawaan F4: kertas yang dipakai kantor desa.
// ==========================================

import type { PaperSize } from '@/types'

export const DEFAULT_PAPER: PaperSize = 'f4'

export const PAPER_OPTIONS: { value: PaperSize; label: string; hint: string }[] = [
  { value: 'a4', label: 'A4', hint: 'A4 (210 × 297 mm)' },
  { value: 'f4', label: 'F4', hint: 'F4/Folio (215 × 330 mm)' },
]

export const paperLabel = (paper: PaperSize) =>
  PAPER_OPTIONS.find((option) => option.value === paper)?.label ?? paper.toUpperCase()
