import type { Id, LetterDocument } from '@/types'

// Kunci dokumen utama di surat.documents (LetterDocuments::MAIN di backend).
export const MAIN_DOCUMENT = 'main'

// 'digital': TTD + stempel tercetak; 'wet': area tanda tangan kosong.
export type PdfTemplate = 'digital' | 'wet'

// Bagian surat yang dipakai untuk pratinjau/unduh. Cukup baris daftar
// (LetterListItem) maupun detail (Letter); `documents` hanya ada di detail.
export type PrintableLetter = {
  id: Id
  letter_number?: string | null
  documents?: LetterDocument[]
  letter_type?: { signed_by_village_head?: boolean; name?: string } | null
}
