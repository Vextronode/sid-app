import {
  OTHER_OCCUPATION,
  otherOccupationFieldName,
  signerFieldNames,
} from '../validation/suratSchema'
import { visibleFields } from './fieldCondition'

/**
 * Menyusun FormData untuk POST /api/letters dari nilai form.
 * Isian definisi jenis surat -> payload[...] atau files[...]; slot tanda tangan pihak lain ->
 * signers[...] (+ signature_files[...] untuk tanda tangan basah).
 */
export function buildLetterFormData(config, letterTypeId, formData) {
  const payload = new FormData()

  payload.append('letter_type_id', letterTypeId)

  // Isian yang tersembunyi untuk jawaban ini tidak dikirim.
  visibleFields(config.fields, formData).forEach((field) => {
    const value = formData[field.name]

    if (field.type === 'file') {
      if (Array.isArray(value) && value[0]) {
        payload.append(`files[${field.name}]`, value[0])
      }

      return
    }

    if (field.type === 'repeater') {
      ;(Array.isArray(value) ? value : []).forEach((row, index) => {
        visibleFields(field.fields, row ?? {}).forEach((subField) => {
          const cell = row?.[subField.name]

          if (cell !== undefined && cell !== null && cell !== '') {
            payload.append(`payload[${field.name}][${index}][${subField.name}]`, cell)
          }

          const otherName = otherOccupationFieldName(subField.name)

          if (subField.type === 'occupation' && cell === OTHER_OCCUPATION) {
            payload.append(`payload[${field.name}][${index}][${otherName}]`, row?.[otherName] ?? '')
          }
        })
      })

      return
    }

    if (field.type === 'family_members') {
      ;(Array.isArray(value) ? value : []).forEach((id) => {
        payload.append(`payload[${field.name}][]`, id)
      })

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
