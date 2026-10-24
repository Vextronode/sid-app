import {
  OTHER_OCCUPATION,
  otherOccupationFieldName,
  signerFieldNames,
} from '../validation/suratSchema'

/**
 * Menyusun FormData untuk POST /api/letters dari nilai form.
 * Isian definisi jenis surat -> payload[...] atau files[...]; slot tanda tangan pihak lain ->
 * signers[...] (+ signature_files[...] untuk tanda tangan basah).
 */
export function buildLetterFormData(config, letterTypeId, formData) {
  const payload = new FormData()

  payload.append('letter_type_id', letterTypeId)

  config.fields.forEach((field) => {
    const value = formData[field.name]

    if (field.type === 'file') {
      if (Array.isArray(value) && value[0]) {
        payload.append(`files[${field.name}]`, value[0])
      }

      return
    }

    if (value !== undefined && value !== null && value !== '') {
      payload.append(`payload[${field.name}]`, value)
    }

    // Teks "Lainnya" hanya dikirim bila pilihan pekerjaannya memang Lainnya.
    if (field.type === 'occupation' && value === OTHER_OCCUPATION) {
      const otherName = otherOccupationFieldName(field.name)

      payload.append(`payload[${otherName}]`, formData[otherName] ?? '')
    }
  })

  ;(config.signatureSlots ?? [])
    .filter((slot) => slot.signer === 'other')
    .forEach((slot) => {
      const names = signerFieldNames(slot.key)

      if (formData[names.mode] === 'wet') {
        payload.append(`signers[${slot.key}][name]`, formData[names.name] ?? '')

        if (formData[names.file]?.[0]) {
          payload.append(`signature_files[${slot.key}]`, formData[names.file][0])
        }

        return
      }

      payload.append(`signers[${slot.key}][nik]`, formData[names.nik] ?? '')
    })

  return payload
}
