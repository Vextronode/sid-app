import { describe, expect, it } from 'vitest'
import { getLetterTypeFormConfig } from './letterTypeConfig'
import { getSuratSchema, signerFieldNames } from '../validation/suratSchema'
import { buildLetterFormData } from './letterFormData'

const letterType = {
  id: 12,
  code: 'A07',
  name: 'Surat Keterangan Penguburan',
  requirements_info: 'KTP, KK',
  produces_letter: true,
  data_action: 'none',
  form_fields: [
    { name: 'nama_almarhum', label: 'Nama Alm.', type: 'text', required: true },
    { name: 'tanggal_meninggal', label: 'Tanggal Meninggal', type: 'date', required: true },
    { name: 'nik_pelapor', label: 'NIK Pelapor', type: 'nik', required: false },
    { name: 'surat_dokter', label: 'Surat Dokter', type: 'file', required: false },
  ],
  signature_slots: [
    { key: 'pemohon', label: 'Pemohon', signer: 'applicant' },
    { key: 'saksi', label: 'Saksi', signer: 'other' },
  ],
}

describe('getLetterTypeFormConfig', () => {
  it('builds the form from the backend definition followed by the common fields', () => {
    const config = getLetterTypeFormConfig(letterType)

    expect(config).toMatchObject({
      id: 12,
      code: 'A07',
      title: 'Surat Keterangan Penguburan',
      requirementsInfo: 'KTP, KK',
      producesLetter: true,
      dataAction: 'none',
    })
    expect(config.fields.map((field) => field.name)).toEqual([
      'nama_almarhum',
      'tanggal_meninggal',
      'nik_pelapor',
      'surat_dokter',
    ])
    expect(config.signatureSlots).toEqual([
      { key: 'pemohon', label: 'Pemohon', signer: 'applicant' },
      { key: 'saksi', label: 'Saksi', signer: 'other' },
    ])
  })

  it('has no fields at all for a type whose physical template has no blanks', () => {
    const config = getLetterTypeFormConfig({
      id: 20,
      code: 'A04',
      name: 'Domisili',
      form_fields: [],
    })

    expect(config.fields).toEqual([])
    expect(config.signatureSlots).toEqual([])
  })

  it('limits a file field to images when the definition says so', () => {
    const config = getLetterTypeFormConfig({
      id: 1,
      code: 'A01',
      name: 'Usaha',
      form_fields: [
        {
          name: 'foto_usaha',
          label: 'Foto Usaha Terkini',
          type: 'file',
          required: true,
          accept: 'image',
        },
        { name: 'surat_dokter', label: 'Surat Dokter', type: 'file', required: false },
      ],
    })

    expect(config.fields[0]).toMatchObject({
      accept: '.jpg,.jpeg,.png',
      imageOnly: true,
      required: true,
    })
    expect(config.fields[1]).toMatchObject({ accept: '.pdf,.jpg,.jpeg,.png', imageOnly: false })
  })

  it('returns null when no letter type is selected', () => {
    expect(getLetterTypeFormConfig(undefined)).toBeNull()
  })
})

describe('getSuratSchema', () => {
  const config = getLetterTypeFormConfig(letterType)
  const names = signerFieldNames('saksi')
  const valid = {
    nama_almarhum: 'Fulan',
    tanggal_meninggal: '2026-10-01',
    nik_pelapor: '',
    [names.mode]: 'digital',
    [names.nik]: '3207010101900001',
  }

  it('accepts values that follow the definition', () => {
    expect(getSuratSchema(config).safeParse(valid).success).toBe(true)
  })

  it('reports required, date, and NIK problems using the field labels', () => {
    const result = getSuratSchema(config).safeParse({
      ...valid,
      nama_almarhum: '',
      tanggal_meninggal: 'kemarin',
      nik_pelapor: '123',
      [names.nik]: '12',
    })

    expect(result.success).toBe(false)
    expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining(['nama_almarhum', 'tanggal_meninggal', 'nik_pelapor', names.nik]),
    )
  })

  it('requires a name and a file when the other party signs on paper', () => {
    const result = getSuratSchema(config).safeParse({
      ...valid,
      [names.mode]: 'wet',
      [names.nik]: '',
    })

    expect(result.success).toBe(false)
    expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining([names.name, names.file]),
    )
  })
})

describe('buildLetterFormData', () => {
  const config = getLetterTypeFormConfig(letterType)
  const names = signerFieldNames('saksi')

  it('maps common fields, definition fields, files, and digital signers', () => {
    const attachment = new File(['a'], 'ktp.pdf', { type: 'application/pdf' })
    const doctorLetter = new File(['b'], 'dokter.jpg', { type: 'image/jpeg' })
    const formData = buildLetterFormData(config, 12, {
      nama_almarhum: 'Fulan',
      tanggal_meninggal: '2026-10-01',
      nik_pelapor: '',
      surat_dokter: [doctorLetter],
      // Nilai di luar definisi (sisa form lama) tidak ikut terkirim.
      keperluan: 'Pengurusan akta',
      catatan: 'Segera',
      dokumen: [attachment],
      [names.mode]: 'digital',
      [names.nik]: '3207010101900001',
    })

    expect(formData.get('letter_type_id')).toBe('12')
    // Keperluan dan catatan bukan lagi isian umum.
    expect(formData.has('purpose')).toBe(false)
    expect(formData.has('notes')).toBe(false)
    expect(formData.get('payload[nama_almarhum]')).toBe('Fulan')
    expect(formData.get('payload[tanggal_meninggal]')).toBe('2026-10-01')
    expect(formData.has('payload[nik_pelapor]')).toBe(false)
    expect(formData.has('payload[keperluan]')).toBe(false)
    // Tidak ada lagi lampiran bebas; hanya berkas isian jenis surat.
    expect(formData.has('attachments[]')).toBe(false)
    expect(formData.get('files[surat_dokter]').name).toBe('dokter.jpg')
    expect(formData.get('signers[saksi][nik]')).toBe('3207010101900001')
    expect(formData.has('signers[pemohon][nik]')).toBe(false)
  })

  it('sends the name and scanned document for a paper signature', () => {
    const scan = new File(['c'], 'pernyataan.jpg', { type: 'image/jpeg' })
    const formData = buildLetterFormData(config, 12, {
      keperluan: 'Pengurusan akta',
      [names.mode]: 'wet',
      [names.name]: 'Pak Saksi',
      [names.file]: [scan],
    })

    expect(formData.get('signers[saksi][name]')).toBe('Pak Saksi')
    expect(formData.get('signature_files[saksi]').name).toBe('pernyataan.jpg')
    expect(formData.has('signers[saksi][nik]')).toBe(false)
  })
})
