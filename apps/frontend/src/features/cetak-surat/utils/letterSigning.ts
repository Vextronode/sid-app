import type { PrintableLetter } from './letterDocuments'

/**
 * Formulir pelayanan (format instansi luar) tidak ditandatangani dan
 * distempel Kepala Desa. Surat dan formulir terbit tanpa TTD: desa
 * mencetaknya lalu TTD dan stempel dibubuhkan basah.
 */
export function isSignedByVillageHead(surat: PrintableLetter | null | undefined) {
  return surat?.letter_type?.signed_by_village_head !== false
}

export const FORM_DOWNLOAD_HINT =
  'Formulir dicetak dan ditandatangani di kantor desa, lalu dibawa ke instansi yang dituju.'

// Surat desa terbit tanpa TTD dan stempel; yang diserahkan ke warga adalah
// cetakan yang ditandatangani dan distempel basah di kantor desa.
export const LETTER_PICKUP_HINT =
  'Surat dicetak, ditandatangani, dan distempel di kantor desa; pemohon mengambilnya di sana. Salinan unduhan tidak bertanda tangan.'
