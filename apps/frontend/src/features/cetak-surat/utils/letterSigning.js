/**
 * Formulir pelayanan (format instansi luar) tidak ditandatangani dan
 * distempel Kepala Desa, jadi hanya punya satu format unduhan.
 */
export function isSignedByVillageHead(surat) {
  return surat?.letter_type?.signed_by_village_head !== false
}

export const FORM_DOWNLOAD_HINT = 'Unduh formulir ini, lalu bawa ke instansi yang dituju.'
