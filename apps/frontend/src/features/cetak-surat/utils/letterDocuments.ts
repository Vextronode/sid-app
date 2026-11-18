import type { Id, LetterDocument } from '@/types'

// Kunci dokumen utama di surat.documents (LetterDocuments::MAIN di backend).
export const MAIN_DOCUMENT = 'main'

// Bagian surat yang dipakai untuk pratinjau/unduh. Cukup baris daftar
// (LetterListItem) maupun detail (Letter); `documents` hanya ada di detail.
export type PrintableLetter = {
  id: Id
  letter_number?: string | null
  documents?: LetterDocument[]
  letter_type?: {
    signed_by_village_head?: boolean
    name?: string
    produces_letter?: boolean
  } | null
}

/**
 * Layanan pendataan (letter_types.produces_letter = false, mis. CPMI F11)
 * tidak menerbitkan surat: hasilnya data yang tersimpan di desa, jadi tidak
 * ada pratinjau maupun unduhan. Tanpa informasi jenis surat dianggap surat.
 */
export function producesLetter(surat: PrintableLetter | null | undefined) {
  return surat?.letter_type?.produces_letter !== false
}

export const DATA_ONLY_RESULT_NOTE =
  'Layanan ini tidak menerbitkan surat. Setelah disetujui Kepala Desa, data Anda tersimpan di desa.'
