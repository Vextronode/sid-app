import { OTHER_OCCUPATION, otherOccupationFieldName } from '../validation/suratSchema'
import type { SuratFormConfig, SuratFormValues } from '../types'
import { visibleFields } from './fieldCondition'

// FormData hanya menerima teks atau berkas; nilai lain dijadikan teks
// (sama seperti yang dilakukan FormData.append sendiri).
const formValue = (value: unknown): string | Blob => (value instanceof Blob ? value : String(value))

/**
 * Menyusun FormData untuk POST /api/letters dari nilai form.
 * Isian definisi jenis surat -> payload[...] atau files[...].
 */
export function buildLetterFormData(
  config: Pick<SuratFormConfig, 'fields'>,
  letterTypeId: number | string,
  formData: SuratFormValues,
) {
  const payload = new FormData()

  payload.append('letter_type_id', String(letterTypeId))

  // Isian yang tersembunyi untuk jawaban ini tidak dikirim.
  visibleFields(config.fields, formData).forEach((field) => {
    const value = formData[field.name]

    if (field.type === 'file') {
      if (Array.isArray(value) && value[0]) {
        payload.append(`files[${field.name}]`, formValue(value[0]))
      }

      return
    }

    if (field.type === 'repeater') {
      ;(Array.isArray(value) ? (value as SuratFormValues[]) : []).forEach((row, index) => {
        visibleFields(field.fields, row ?? {}).forEach((subField) => {
          const cell = row?.[subField.name]

          if (cell !== undefined && cell !== null && cell !== '') {
            payload.append(`payload[${field.name}][${index}][${subField.name}]`, formValue(cell))
          }

          const otherName = otherOccupationFieldName(subField.name)

          if (subField.type === 'occupation' && cell === OTHER_OCCUPATION) {
            payload.append(
              `payload[${field.name}][${index}][${otherName}]`,
              formValue(row?.[otherName] ?? ''),
            )
          }
        })
      })

      return
    }

    if (field.type === 'family_members') {
      ;(Array.isArray(value) ? value : []).forEach((id) => {
        payload.append(`payload[${field.name}][]`, formValue(id))
      })

      return
    }

    if (value !== undefined && value !== null && value !== '') {
      payload.append(`payload[${field.name}]`, formValue(value))
    }

    // Teks "Lainnya" hanya dikirim bila pilihan pekerjaannya memang Lainnya.
    if (field.type === 'occupation' && value === OTHER_OCCUPATION) {
      const otherName = otherOccupationFieldName(field.name)

      payload.append(`payload[${otherName}]`, formValue(formData[otherName] ?? ''))
    }
  })

  return payload
}
