import { signerFieldNames } from '../validation/suratSchema'
import { COMMON_FIELD_NAMES } from './letterTypeConfig'

/**
 * Menyusun FormData untuk POST /api/letters dari nilai form.
 * Isian umum -> purpose/notes/attachments[]; isian definisi jenis surat
 * -> payload[...] atau files[...]; slot tanda tangan pihak lain ->
 * signers[...] (+ signature_files[...] untuk tanda tangan basah).
 */
export function buildLetterFormData(config, letterTypeId, formData) {
  const payload = new FormData()

  payload.append('letter_type_id', letterTypeId)

  if (formData.keperluan) {
    payload.append('purpose', formData.keperluan)
  }

  if (formData.catatan) {
    payload.append('notes', formData.catatan)
  }

  if (Array.isArray(formData.dokumen)) {
    formData.dokumen.forEach((file) => {
      payload.append('attachments[]', file)
    })
  }

  config.fields
    .filter((field) => !COMMON_FIELD_NAMES.includes(field.name))
    .forEach((field) => {
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
