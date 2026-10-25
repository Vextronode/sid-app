import { z } from 'zod'

import { visibleFields } from '../utils/fieldCondition'

const requiredText = (label) => z.string().trim().min(1, `${label} wajib diisi`)

const optionalText = z.string().trim().optional().or(z.literal(''))

const nikPattern = /^\d{16}$/

const requiredNik = (label) =>
  z
    .string()
    .trim()
    .min(1, `${label} wajib diisi`)
    .regex(nikPattern, `${label} harus terdiri dari 16 digit`)

const optionalNik = (label) =>
  z
    .string()
    .trim()
    .refine(
      (value) => value === '' || nikPattern.test(value),
      `${label} harus terdiri dari 16 digit`,
    )
    .optional()

const requiredDate = (label) =>
  z.string().trim().min(1, `${label} wajib diisi`).date(`${label} tidak valid`)

const numberText = (label, required) =>
  z
    .string()
    .trim()
    .refine((value) => (required ? value !== '' : true), `${label} wajib diisi`)
    .refine((value) => value === '' || !Number.isNaN(Number(value)), `${label} harus berupa angka`)

const optionalFiles = z.array(z.instanceof(File)).optional().default([])

// Nilai isian pekerjaan bila pemohon memilih "Lainnya"; teksnya diisi di
// isian pendamping <nama>_lainnya (LetterFormSchema::OTHER_OCCUPATION).
export const OTHER_OCCUPATION = 'lainnya'

export function otherOccupationFieldName(name) {
  return `${name}_lainnya`
}

function fieldSchema(field) {
  const { label, required } = field

  switch (field.type) {
    case 'file':
      return required
        ? z.array(z.instanceof(File)).min(1, `${label} wajib diupload`)
        : optionalFiles
    case 'date':
      return required ? requiredDate(label) : optionalText
    case 'nik':
      return required ? requiredNik(label) : optionalNik(label)
    case 'number':
      return required ? numberText(label, true) : numberText(label, false).optional()
    case 'occupation':
      return required ? z.string().trim().min(1, `${label} wajib dipilih`) : optionalText
    default:
      return required ? requiredText(label) : optionalText
  }
}

const LIST_TYPES = ['repeater', 'family_members']

// Jumlah baris dan isi tiap baris repeater; sub-isian bersyarat per baris.
function validateRows(field, rows, context) {
  const list = Array.isArray(rows) ? rows : []
  const min = field.min ?? (field.required ? 1 : 0)
  const max = field.max ?? 20

  if (list.length < min) {
    context.addIssue({
      code: 'custom',
      path: [field.name],
      message: `Isi minimal ${min} ${field.itemLabel || 'baris'}`,
    })
  }

  if (list.length > max) {
    context.addIssue({
      code: 'custom',
      path: [field.name],
      message: `Maksimal ${max} ${field.itemLabel || 'baris'}`,
    })
  }

  list.forEach((row, index) => {
    visibleFields(field.fields, row ?? {}).forEach((subField) => {
      const result = fieldSchema(subField).safeParse(row?.[subField.name] ?? '')

      if (!result.success) {
        context.addIssue({
          code: 'custom',
          path: [field.name, index, subField.name],
          message: result.error.issues[0]?.message ?? `${subField.label} tidak valid`,
        })
      }
    })
  })
}

/**
 * Nama isian form untuk sebuah slot tanda tangan pihak lain.
 */
export function signerFieldNames(slotKey) {
  return {
    mode: `signer_${slotKey}_mode`,
    nik: `signer_${slotKey}_nik`,
    name: `signer_${slotKey}_name`,
    file: `signer_${slotKey}_file`,
  }
}

/**
 * Schema validasi form diturunkan dari definisi jenis surat yang dikirim
 * backend (config.fields dan config.signatureSlots). Backend memvalidasi
 * ulang dengan definisi yang sama.
 */
export function getSuratSchema(config) {
  const shape = {}

  const occupationFields = (config?.fields ?? []).filter((field) => field.type === 'occupation')

  const fields = config?.fields ?? []
  const lateFields = fields.filter((field) => field.visibleWhen || LIST_TYPES.includes(field.type))

  // Isian bersyarat dan isian berulang divalidasi di superRefine (bila tampil).
  fields.forEach((field) => {
    shape[field.name] =
      field.visibleWhen || LIST_TYPES.includes(field.type) ? z.any().optional() : fieldSchema(field)
  })

  occupationFields.forEach((field) => {
    shape[otherOccupationFieldName(field.name)] = z
      .string()
      .trim()
      .max(100, `${field.label} maksimal 100 karakter`)
      .optional()
  })

  const otherSlots = (config?.signatureSlots ?? []).filter((slot) => slot.signer === 'other')

  otherSlots.forEach((slot) => {
    const names = signerFieldNames(slot.key)

    shape[names.mode] = z.enum(['digital', 'wet']).default('digital')
    shape[names.nik] = z.string().trim().optional()
    shape[names.name] = z.string().trim().optional()
    shape[names.file] = optionalFiles
  })

  return z.object(shape).superRefine((values, context) => {
    const visibleNames = new Set(visibleFields(fields, values).map((field) => field.name))

    lateFields
      .filter((field) => visibleNames.has(field.name))
      .forEach((field) => {
        if (field.type === 'repeater') {
          validateRows(field, values[field.name], context)

          return
        }

        if (field.type === 'family_members') {
          if (field.required && !(values[field.name] ?? []).length) {
            context.addIssue({
              code: 'custom',
              path: [field.name],
              message: `Pilih minimal satu ${field.label.toLowerCase()}`,
            })
          }

          return
        }

        const result = fieldSchema(field).safeParse(values[field.name])

        if (!result.success) {
          context.addIssue({
            code: 'custom',
            path: [field.name],
            message: result.error.issues[0]?.message ?? `${field.label} tidak valid`,
          })
        }
      })

    occupationFields.forEach((field) => {
      const otherName = otherOccupationFieldName(field.name)

      if (
        visibleNames.has(field.name) &&
        values[field.name] === OTHER_OCCUPATION &&
        !values[otherName]
      ) {
        context.addIssue({
          code: 'custom',
          path: [otherName],
          message: `Tuliskan ${field.label.toLowerCase()}`,
        })
      }
    })

    otherSlots.forEach((slot) => {
      const names = signerFieldNames(slot.key)

      if (values[names.mode] === 'wet') {
        if (!values[names.name]) {
          context.addIssue({
            code: 'custom',
            path: [names.name],
            message: `Nama penanda tangan ${slot.label} wajib diisi`,
          })
        }

        if (!values[names.file]?.length) {
          context.addIssue({
            code: 'custom',
            path: [names.file],
            message: `Unggah dokumen ber-tanda tangan basah untuk ${slot.label}`,
          })
        }

        return
      }

      if (!nikPattern.test(values[names.nik] ?? '')) {
        context.addIssue({
          code: 'custom',
          path: [names.nik],
          message: `NIK ${slot.label} harus terdiri dari 16 digit`,
        })
      }
    })
  })
}
