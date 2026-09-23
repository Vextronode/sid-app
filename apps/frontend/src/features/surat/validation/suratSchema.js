import { z } from 'zod'

const requiredText = (label) => z.string().trim().min(1, `${label} wajib diisi`)

const optionalText = z.string().trim().optional().or(z.literal(''))

const requiredNik = (label) =>
  z
    .string()
    .trim()
    .min(1, `${label} wajib diisi`)
    .regex(/^\d{16}$/, `${label} harus terdiri dari 16 digit`)

const requiredDate = (label) =>
  z.string().trim().min(1, `${label} wajib diisi`).date(`${label} tidak valid`)

const optionalFiles = z.array(z.instanceof(File)).optional().default([])

/**
 * Schema dasar yang digunakan oleh semua jenis surat.
 *
 * Field ini tidak ditampilkan sebagai field konfigurasi:
 * - keperluan
 * - catatan
 * - dokumen
 */
const commonFields = {
  keperluan: requiredText('Keperluan'),
  catatan: optionalText,
  dokumen: optionalFiles,
}

/**
 * Schema per jenis surat.
 */
export const SURAT_SCHEMAS = {
  A01: z.object({
    ...commonFields,
    jenis_usaha: requiredText('Jenis Usaha'),
    lokasi_usaha: requiredText('Lokasi Usaha'),
  }),

  A02: z.object({
    ...commonFields,
  }),

  A03: z.object({
    ...commonFields,
    jenis_usaha: requiredText('Jenis Usaha'),
    penghasilan_perbulan: requiredText('Penghasilan per Bulan'),
  }),

  A04: z.object({
    ...commonFields,
  }),

  A05: z.object({
    ...commonFields,
  }),

  A06: z.object({
    ...commonFields,
    nama_lama: requiredText('Nama Lama'),
    nama_benar: requiredText('Nama yang Benar'),
    sumber_dokumen: optionalText,
  }),

  A07: z.object({
    ...commonFields,
    nama_almarhum: requiredText('Nama Alm.'),
    tanggal_meninggal: requiredDate('Tanggal Meninggal'),
    tempat_meninggal: requiredText('Tempat Meninggal'),
    sebab: optionalText,
    tempat_pemakaman: requiredText('Tempat Pemakaman'),
  }),

  A08: z.object({
    ...commonFields,
    nama_ayah: requiredText('Nama Ayah'),
    nik_ayah: requiredNik('NIK Ayah'),
    nama_ibu: requiredText('Nama Ibu'),
    nik_ibu: requiredNik('NIK Ibu'),
    tempat_lahir_anak: requiredText('Tempat Lahir Anak'),
    tanggal_lahir_anak: requiredDate('Tanggal Lahir Anak'),
  }),

  A09: z.object({
    ...commonFields,
  }),

  A10: z.object({
    ...commonFields,
    alamat_rumah: requiredText('Alamat Rumah'),
  }),
}

/**
 * Ambil schema berdasarkan kode jenis surat.
 *
 * Jika kode tidak ditemukan, gunakan schema berdasarkan
 * field config agar form tetap bisa melakukan validasi
 * untuk konfigurasi baru.
 */
export function getSuratSchema(config) {
  if (SURAT_SCHEMAS[config?.code]) {
    return SURAT_SCHEMAS[config.code]
  }

  const fields = config?.fields ?? []

  const dynamicShape = {}

  fields.forEach((field) => {
    if (field.type === 'file') {
      dynamicShape[field.name] = field.required
        ? z.array(z.instanceof(File)).min(1, `${field.label} wajib diupload`)
        : optionalFiles

      return
    }

    if (field.type === 'date') {
      dynamicShape[field.name] = field.required ? requiredDate(field.label) : optionalText

      return
    }

    dynamicShape[field.name] = field.required ? requiredText(field.label) : optionalText
  })

  return z.object(dynamicShape)
}
