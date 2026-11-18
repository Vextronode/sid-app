import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getLetterDetail, openProtectedFile } = vi.hoisted(() => ({
  getLetterDetail: vi.fn(),
  openProtectedFile: vi.fn(),
}))

vi.mock('../api/letterExtrasApi', () => ({ getLetterDetail }))
vi.mock('@/lib/downloadFile', () => ({ openProtectedFile }))

import { FormAnswersReview } from './FormAnswersReview'

const letter = {
  id: 'l-1',
  applicant_name: 'Siti Aminah',
  applicant_nik_masked: '************0001',
  citizen: {
    name: 'Siti Aminah',
    place_of_birth: 'Cianjur',
    date_of_birth: '2000-05-17',
    gender: 'P',
    religion: 'islam',
    marital_status: null,
    mother_name: 'Aminah Binti Karta',
    address: 'Kp. Sukamaju',
    rt: { number: '01' },
    rw: { number: '02' },
    hamlet: { name: 'Sukamaju' },
  },
  payload: {
    agama: 'islam',
    status_perkawinan: 'belum_kawin',
    tinggi_badan: '160',
    pengalaman_kerja: [
      { perusahaan: 'PT Sentosa', jabatan: 'Operator', mulai: 'Jan 2021', selesai: 'Des 2023' },
    ],
    penanggung_jawab_sumber: 'kk',
    penanggung_jawab_anggota: 'c-2',
    penanggung_jawab_anggota_nama: 'Aminah Binti Karta',
    penanggung_jawab_anggota_alamat: 'Kp. Sukamaju',
    penanggung_jawab_hubungan: 'ibu',
    kontrak_mulai: '2027-03-01',
  },
  attachments: [
    { id: 7, kind: 'field', field: 'scan_paspor', url: '/api/letters/l-1/attachments/7' },
  ],
  letter_type: {
    produces_letter: false,
    form_fields: [
      {
        name: 'agama',
        label: 'Agama',
        type: 'select',
        section: 'Data Diri',
        from_applicant: { column: 'religion' },
      },
      {
        name: 'status_perkawinan',
        label: 'Status Perkawinan',
        type: 'select',
        section: 'Data Diri',
        from_applicant: { column: 'marital_status' },
      },
      { name: 'tinggi_badan', label: 'Tinggi Badan (cm)', type: 'number', section: 'Data Diri' },
      {
        name: 'pengalaman_kerja',
        label: 'Pengalaman Kerja',
        type: 'repeater',
        section: 'Pendidikan',
        fields: [
          { name: 'perusahaan', label: 'Nama Perusahaan', type: 'text' },
          { name: 'jabatan', label: 'Jabatan', type: 'text' },
          { name: 'mulai', label: 'Mulai', type: 'text' },
          { name: 'selesai', label: 'Selesai', type: 'text' },
        ],
      },
      {
        name: 'penanggung_jawab_sumber',
        label: 'Penanggung Jawab Diambil dari',
        type: 'select',
        section: 'Kontak Darurat',
        options: [
          { value: 'kk', label: 'Anggota KK saya' },
          { value: 'luar_kk', label: 'Di luar KK' },
        ],
      },
      {
        name: 'penanggung_jawab_anggota',
        label: 'Anggota KK',
        type: 'family_member',
        section: 'Kontak Darurat',
        relation_hint: true,
      },
      {
        name: 'penanggung_jawab_hubungan',
        label: 'Hubungan dengan Anda',
        type: 'select',
        section: 'Kontak Darurat',
        options: [{ value: 'ibu', label: 'Ibu' }],
      },
      {
        name: 'kontrak_mulai',
        label: 'Tanggal Mulai Kontrak',
        type: 'date',
        section: 'Penempatan',
      },
      { name: 'scan_paspor', label: 'Scan Paspor', type: 'file', section: 'Dokumen' },
      { name: 'scan_kk', label: 'Scan KK', type: 'file', section: 'Dokumen' },
    ],
  },
}

const valueOf = (label: string) => {
  const row = screen.getAllByText(label, { selector: 'dt' })[0].closest('div')

  return row?.querySelector('dd')?.textContent
}

describe('FormAnswersReview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getLetterDetail.mockResolvedValue(letter)
    openProtectedFile.mockResolvedValue(undefined)
  })

  it('lists every answer per section, one per row, with identity from population data', async () => {
    render(<FormAnswersReview letterId="l-1" />)

    expect(await screen.findByRole('heading', { name: 'Data Diri' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent)).toEqual([
      'Data Diri',
      'Pendidikan',
      'Kontak Darurat',
      'Penempatan',
      'Dokumen',
    ])

    expect(valueOf('Tempat, Tanggal Lahir')).toBe('Cianjur, 17 Mei 2000')
    expect(valueOf('Nama Ibu Kandung')).toBe('Aminah Binti Karta')
    expect(valueOf('RT/RW')).toBe('01/02')
    // Status kawin kosong di data penduduk: jawaban form.
    expect(valueOf('Status Perkawinan')).toBe('Belum Kawin')
    // Isian dari data penduduk tidak diulang sebagai isian terpisah.
    expect(screen.getAllByText('Agama', { selector: 'dt' })).toHaveLength(1)
    expect(valueOf('Tinggi Badan (cm)')).toBe('160')

    // Baris berulang dipecah per isian, bukan digabung dengan garis miring.
    const job = screen.getByText('Pengalaman Kerja 1').closest('div') as HTMLElement
    expect(within(job).getByText('PT Sentosa')).toBeInTheDocument()
    expect(within(job).getByText('Operator')).toBeInTheDocument()
    expect(screen.queryByText(/PT Sentosa \//)).toBeNull()

    expect(valueOf('Penanggung Jawab Diambil dari')).toBe('Anggota KK saya')
    expect(valueOf('Anggota KK')).toBe('Aminah Binti Karta')
    expect(valueOf('Hubungan dengan Anda')).toBe('Ibu')
    expect(valueOf('Tanggal Mulai Kontrak')).toBe('1 Maret 2027')
    expect(valueOf('Scan KK')).toBe('Tidak diunggah')

    fireEvent.click(screen.getByRole('button', { name: 'Lihat dokumen' }))
    expect(openProtectedFile).toHaveBeenCalledWith('/api/letters/l-1/attachments/7')
  })
})
