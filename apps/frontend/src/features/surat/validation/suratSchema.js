import { z } from 'zod'

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
    default:
      return required ? requiredText(label) : optionalText
  }
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

  ;(config?.fields ?? []).forEach((field) => {
    shape[field.name] = fieldSchema(field)
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
