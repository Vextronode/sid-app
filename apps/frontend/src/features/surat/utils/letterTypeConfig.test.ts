import { describe, expect, it } from 'vitest'
import {
  applicantPrefill,
  applicantValue,
  applicantValues,
  getLetterTypeFormConfig,
} from './letterTypeConfig'
import { getSuratSchema, signerFieldNames, todayDate } from '../validation/suratSchema'
import { buildLetterFormData } from './letterFormData'
import { partialFixture, present } from '@/test/fixtures'
import type { LetterType, User } from '@/types'
import type { SuratField } from '../types'
import type { SuratFormValues } from '../types'

// Konfigurasi jenis surat yang diuji selalu ada.
const formConfig = (source: Parameters<typeof getLetterTypeFormConfig>[0]) =>
  present(getLetterTypeFormConfig(source), 'konfigurasi jenis surat')

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
    const config = formConfig(letterType)

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
    const config = formConfig({
      id: 20,
      code: 'A04',
      name: 'Domisili',
      form_fields: [],
    })

    expect(config.fields).toEqual([])
    expect(config.signatureSlots).toEqual([])
  })

  it('limits a file field to images when the definition says so', () => {
    const config = formConfig({
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

  it('keeps the default answer and help text of a field', () => {
    const config = formConfig({
      ...letterType,
      form_fields: [
        {
          name: 'pengurusan',
          label: 'Pengurusan',
          type: 'select',
          required: true,
          default: 'sendiri',
          help: 'Pilih Diwakilkan bila diurus orang lain.',
          options: [
            { value: 'sendiri', label: 'Saya sendiri' },
            { value: 'diwakilkan', label: 'Diwakilkan' },
          ],
        },
      ],
    })

    expect(config.fields[0].defaultValue).toBe('sendiri')
    expect(config.fields[0].help).toBe('Pilih Diwakilkan bila diurus orang lain.')
    expect(config.fields[0].typedWhenEmpty).toBe(false)

    const adoption = formConfig({
      ...letterType,
      form_fields: [{ name: 'nik_anak', label: 'NIK Anak', type: 'nik', typed_when_empty: true }],
    })
    expect(adoption.fields[0].typedWhenEmpty).toBe(true)
  })

  it('leaves out the family roster that the system builds on submission', () => {
    const config = formConfig({
      ...letterType,
      form_fields: [
        {
          name: 'almarhum',
          label: 'Almarhum',
          type: 'family_member',
          required: true,
          not_self: true,
        },
        { name: 'kk_baru', label: 'Susunan KK Baru', type: 'family_roster', required: false },
      ],
    })

    expect(config.fields.map((field) => field.name)).toEqual(['almarhum'])
    expect(config.fields[0].notSelf).toBe(true)
    expect(config.fields[0].emptyLabel).toBeNull()
  })

  it('returns null when no letter type is selected', () => {
    expect(getLetterTypeFormConfig(undefined)).toBeNull()
  })
})

describe('getSuratSchema', () => {
  const config = formConfig(letterType)
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
    expect(present(result.error).issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining(['nama_almarhum', 'tanggal_meninggal', 'nik_pelapor', names.nik]),
    )
  })

  it('requires a chosen family member, and asks for the typed father only when none is chosen', () => {
    const birth = formConfig({
      ...letterType,
      signature_slots: [],
      form_fields: [
        { name: 'ibu', label: 'Ibu', type: 'family_member', required: true },
        { name: 'ayah', label: 'Ayah', type: 'family_member', required: false },
        {
          name: 'nama_ayah',
          label: 'Nama Ayah',
          type: 'text',
          required: true,
          visible_when: { field: 'ayah', filled: false },
        },
      ],
    })
    const issues = (values: SuratFormValues) =>
      (getSuratSchema(birth).safeParse(values).error?.issues ?? []).map((issue) => issue.path[0])

    expect(issues({ ibu: '', ayah: '' })).toEqual(expect.arrayContaining(['ibu', 'nama_ayah']))
    expect(issues({ ibu: 'c-1', ayah: 'c-2' })).toEqual([])
  })

  it('accepts only an HH:MM value from the time input', () => {
    const timed = formConfig({
      ...letterType,
      signature_slots: [],
      form_fields: [{ name: 'pukul_lahir', label: 'Pukul Lahir', type: 'time', required: true }],
    })
    const schema = getSuratSchema(timed)

    expect(schema.safeParse({ pukul_lahir: '08:30' }).success).toBe(true)
    expect(schema.safeParse({ pukul_lahir: '' }).success).toBe(false)
    expect(schema.safeParse({ pukul_lahir: '25:00' }).success).toBe(false)
  })

  it('requires a name and a file when the other party signs on paper', () => {
    const result = getSuratSchema(config).safeParse({
      ...valid,
      [names.mode]: 'wet',
      [names.nik]: '',
    })

    expect(result.success).toBe(false)
    expect(present(result.error).issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining([names.name, names.file]),
    )
  })
})

describe('buildLetterFormData', () => {
  const config = formConfig(letterType)
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
    expect((formData.get('files[surat_dokter]') as File).name).toBe('dokter.jpg')
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
    expect((formData.get('signature_files[saksi]') as File).name).toBe('pernyataan.jpg')
    expect(formData.has('signers[saksi][nik]')).toBe(false)
  })
})

describe('occupation field', () => {
  const occupationConfig = formConfig({
    id: 21,
    code: 'A11',
    name: 'Surat Keterangan Ahli Waris',
    form_fields: [
      {
        name: 'pekerjaan_almarhum',
        label: 'Pekerjaan Almarhum',
        type: 'occupation',
        required: true,
      },
    ],
  })
  const schema = getSuratSchema(occupationConfig)

  it('requires a choice and the other text only when "Lainnya" is picked', () => {
    expect(schema.safeParse({ pekerjaan_almarhum: '' }).success).toBe(false)
    expect(schema.safeParse({ pekerjaan_almarhum: '3' }).success).toBe(true)

    const missingOther = schema.safeParse({
      pekerjaan_almarhum: 'lainnya',
      pekerjaan_almarhum_lainnya: ' ',
    })
    expect(missingOther.success).toBe(false)
    expect(present(missingOther.error).issues[0].path).toEqual(['pekerjaan_almarhum_lainnya'])

    expect(
      schema.safeParse({ pekerjaan_almarhum: 'lainnya', pekerjaan_almarhum_lainnya: 'Nelayan' })
        .success,
    ).toBe(true)
  })

  it('sends the other text only for "Lainnya"', () => {
    const fromCatalog = buildLetterFormData(occupationConfig, 21, {
      pekerjaan_almarhum: '3',
      pekerjaan_almarhum_lainnya: 'sisa ketikan',
    })
    expect(fromCatalog.get('payload[pekerjaan_almarhum]')).toBe('3')
    expect(fromCatalog.has('payload[pekerjaan_almarhum_lainnya]')).toBe(false)

    const other = buildLetterFormData(occupationConfig, 21, {
      pekerjaan_almarhum: 'lainnya',
      pekerjaan_almarhum_lainnya: 'nelayan',
    })
    expect(other.get('payload[pekerjaan_almarhum]')).toBe('lainnya')
    expect(other.get('payload[pekerjaan_almarhum_lainnya]')).toBe('nelayan')
  })
})

describe('conditional fields', () => {
  const conditionalConfig = formConfig({
    id: 31,
    code: 'F01',
    name: 'Formulir',
    form_fields: [
      {
        name: 'warga',
        label: 'Kewarganegaraan',
        type: 'select',
        required: true,
        options: [
          { value: 'wni', label: 'WNI' },
          { value: 'wna', label: 'WNA' },
        ],
      },
      {
        name: 'paspor',
        label: 'Nomor Paspor',
        type: 'text',
        required: true,
        visible_when: { field: 'warga', equals: 'wna' },
      },
    ],
  })
  const schema = getSuratSchema(conditionalConfig)

  it('requires a field only while it is shown', () => {
    expect(schema.safeParse({ warga: 'wni' }).success).toBe(true)

    const missing = schema.safeParse({ warga: 'wna', paspor: '' })
    expect(missing.success).toBe(false)
    expect(present(missing.error).issues[0].path).toEqual(['paspor'])

    expect(schema.safeParse({ warga: 'wna', paspor: 'A123' }).success).toBe(true)
  })

  it('does not send the value of a hidden field', () => {
    const hidden = buildLetterFormData(conditionalConfig, 31, { warga: 'wni', paspor: 'A123' })
    expect(hidden.has('payload[paspor]')).toBe(false)

    const shown = buildLetterFormData(conditionalConfig, 31, { warga: 'wna', paspor: 'A123' })
    expect(shown.get('payload[paspor]')).toBe('A123')
  })
})

describe('repeating fields', () => {
  const repeatingConfig = formConfig({
    id: 41,
    code: 'F03',
    name: 'Formulir Pindah',
    form_fields: [
      {
        name: 'anak',
        label: 'Anak',
        type: 'repeater',
        required: true,
        max: 2,
        item_label: 'anak',
        fields: [
          { name: 'nama', label: 'Nama Anak', type: 'text', required: true },
          {
            name: 'paspor',
            label: 'Nomor Paspor',
            type: 'text',
            required: true,
            visible_when: { field: 'warga', equals: 'wna' },
          },
          { name: 'warga', label: 'Kewarganegaraan', type: 'text', required: false },
        ],
      },
      { name: 'anggota', label: 'Anggota', type: 'family_members', required: true },
    ],
  })
  const schema = getSuratSchema(repeatingConfig)

  it('validates the number of rows, each row and the chosen members', () => {
    const empty = schema.safeParse({ anak: [], anggota: [] })
    expect(empty.success).toBe(false)
    expect(present(empty.error).issues.map((issue) => issue.path.join('.'))).toEqual([
      'anak',
      'anggota',
    ])

    const missingName = schema.safeParse({ anak: [{ nama: '' }], anggota: ['c-1'] })
    expect(present(missingName.error).issues[0].path).toEqual(['anak', 0, 'nama'])

    expect(
      schema.safeParse({
        anak: [{ nama: 'Budi' }, { nama: 'Ani' }, { nama: 'Cici' }],
        anggota: ['c-1'],
      }).success,
    ).toBe(false)
    expect(schema.safeParse({ anak: [{ nama: 'Budi' }], anggota: ['c-1'] }).success).toBe(true)
  })

  it('sends rows and member ids as nested payload keys', () => {
    const formData = buildLetterFormData(repeatingConfig, 41, {
      anak: [{ nama: 'Budi', paspor: 'SISA' }, { nama: 'Ani' }],
      anggota: ['c-1', 'c-2'],
    })

    expect(formData.get('payload[anak][0][nama]')).toBe('Budi')
    expect(formData.has('payload[anak][0][paspor]')).toBe(false)
    expect(formData.get('payload[anak][1][nama]')).toBe('Ani')
    expect(formData.getAll('payload[anggota][]')).toEqual(['c-1', 'c-2'])
  })
})

describe('row member and occupation sub-fields', () => {
  const config = formConfig({
    id: 51,
    code: 'F02',
    name: 'Perubahan Elemen Data',
    form_fields: [
      {
        name: 'perubahan',
        label: 'Perubahan',
        type: 'repeater',
        required: true,
        fields: [
          { name: 'anggota', label: 'Anggota Keluarga', type: 'family_member', required: true },
          {
            name: 'pekerjaan_menjadi',
            label: 'Pekerjaan Menjadi',
            type: 'occupation',
            required: false,
          },
        ],
      },
    ],
  })
  const schema = getSuratSchema(config)

  it('requires the member and the other occupation text per row', () => {
    expect(
      present(schema.safeParse({ perubahan: [{ anggota: '' }] }).error).issues[0].path,
    ).toEqual(['perubahan', 0, 'anggota'])

    const missingOther = schema.safeParse({
      perubahan: [{ anggota: 'c-1', pekerjaan_menjadi: 'lainnya', pekerjaan_menjadi_lainnya: '' }],
    })
    expect(present(missingOther.error).issues[0].path).toEqual([
      'perubahan',
      0,
      'pekerjaan_menjadi_lainnya',
    ])
  })

  it('sends the other occupation text only for "Lainnya" rows', () => {
    const formData = buildLetterFormData(config, 51, {
      perubahan: [
        { anggota: 'c-1', pekerjaan_menjadi: 'lainnya', pekerjaan_menjadi_lainnya: 'buruh' },
        { anggota: 'c-2', pekerjaan_menjadi: '7', pekerjaan_menjadi_lainnya: 'sisa' },
      ],
    })

    expect(formData.get('payload[perubahan][0][pekerjaan_menjadi_lainnya]')).toBe('buruh')
    expect(formData.has('payload[perubahan][1][pekerjaan_menjadi_lainnya]')).toBe(false)
    expect(formData.get('payload[perubahan][1][anggota]')).toBe('c-2')
  })
})

describe('applicantValue', () => {
  const field = partialFixture<SuratField>({
    name: 'peran_pemohon',
    fromApplicant: { column: 'gender', map: { L: 'suami', P: 'istri' } },
  })

  it('derives the role from the applicant gender', () => {
    expect(applicantValue(field, partialFixture<User>({ citizen: { gender: 'P' } }))).toBe('istri')
    expect(
      applicantValues(
        [field, partialFixture<SuratField>({ name: 'lain' })],
        partialFixture<User>({ citizen: { gender: 'L' } }),
      ),
    ).toEqual({
      peran_pemohon: 'suami',
    })
  })

  it('asks the question when the applicant data is missing', () => {
    expect(applicantValue(field, partialFixture<User>({ citizen: {} }))).toBeNull()
    expect(
      applicantValue(
        partialFixture<SuratField>({ name: 'lain' }),
        partialFixture<User>({ citizen: { gender: 'L' } }),
      ),
    ).toBeNull()
  })
})

describe('past dates and whole numbers', () => {
  const config = formConfig(
    partialFixture<LetterType>({
      code: 'A03',
      form_fields: [
        { name: 'tanggal_lahir', label: 'Tanggal Lahir', type: 'date', required: true, past: true },
        {
          name: 'penghasilan',
          label: 'Penghasilan',
          type: 'number',
          required: true,
          integer: true,
          min_value: 1,
        },
      ],
    }),
  )
  const errorsOf = (values: SuratFormValues) =>
    (getSuratSchema(config).safeParse(values).error?.issues ?? []).map((issue) => issue.message)

  it('rejects a date after today and amounts that are not whole and positive', () => {
    expect(errorsOf({ tanggal_lahir: '2999-01-01', penghasilan: '2500000' })).toEqual([
      'Tanggal Lahir tidak boleh sesudah hari ini',
    ])
    expect(errorsOf({ tanggal_lahir: todayDate(), penghasilan: '0' })).toEqual([
      'Penghasilan minimal 1',
    ])
    expect(errorsOf({ tanggal_lahir: '2000-01-01', penghasilan: '2500,5' })).toEqual([
      'Penghasilan harus berupa angka',
    ])
    expect(errorsOf({ tanggal_lahir: '2000-01-01', penghasilan: '2500.5' })).toEqual([
      'Penghasilan harus berupa bilangan bulat',
    ])
    expect(errorsOf({ tanggal_lahir: '2000-01-01', penghasilan: '2500000' })).toEqual([])
  })
})

describe('applicantPrefill', () => {
  it('starts editable fields from the applicant population data', () => {
    const config = formConfig(
      partialFixture<LetterType>({
        code: 'A03',
        form_fields: [
          { name: 'jenis_usaha', type: 'occupation', prefill_from_applicant: 'occupation_id' },
          { name: 'alamat_domisili', type: 'village_area', prefill_from_applicant: 'rt_id' },
          { name: 'nama_benar', prefill_from_applicant: 'name' },
          { name: 'penghasilan_perbulan', type: 'number' },
        ],
      }),
    )

    expect(
      applicantPrefill(
        config.fields,
        partialFixture<User>({ citizen: { occupation_id: 4, rt_id: 9, name: '' } }),
      ),
    ).toEqual({
      jenis_usaha: '4',
      alamat_domisili: '9',
    })
    expect(applicantPrefill(config.fields, null)).toEqual({})
  })
})

describe('family_member roles', () => {
  it('keeps the allowed family roles of a member field', () => {
    const config = formConfig({
      id: 8,
      code: 'F08',
      name: 'Pengakuan Anak',
      form_fields: [
        { name: 'anak', label: 'Anak', type: 'family_member', required: true, roles: ['anak'] },
        { name: 'ibu', label: 'Ibu', type: 'family_member', required: true },
      ],
    })

    expect(config.fields.map((field) => field.roles)).toEqual([['anak'], null])
  })
})
