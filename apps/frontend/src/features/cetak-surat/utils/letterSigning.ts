import type { PrintableLetter } from './letterDocuments'

/**
 * Formulir pelayanan (format instansi luar) tidak ditandatangani dan
 * distempel Kepala Desa; format unduhannya TTD digital (TTD pemohon dan
 * pihak terkait dari akun) atau TTD basah.
 */
export function isSignedByVillageHead(surat: PrintableLetter | null | undefined) {
  return surat?.letter_type?.signed_by_village_head !== false
}

export const FORM_DOWNLOAD_HINT = 'Unduh formulir ini, lalu bawa ke instansi yang dituju.'
