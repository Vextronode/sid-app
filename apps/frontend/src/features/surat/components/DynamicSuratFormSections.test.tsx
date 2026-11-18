import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DynamicSuratForm } from './DynamicSuratForm'
import { getLetterTypeFormConfig } from '../utils/letterTypeConfig'
import { getMigrantWorkerPrefill } from '@/features/data-cpmi/api'
import { present } from '@/test/fixtures'

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      name: 'Siti Aminah',
      role: 'warga',
      nik: '3201010101010001',
      citizen: {
        name: 'Siti Aminah',
        place_of_birth: 'Cianjur',
        date_of_birth: '2000-05-17',
        gender: 'P',
        religion: 'islam',
        marital_status: 'belum_kawin',
        mother_name: 'Aminah Binti Karta',
        address: 'Kp. Sukamaju',
        rt: { number: '01' },
        rw: { number: '02' },
        hamlet: { name: 'Sukamaju' },
        village: {
          name: 'Cibenda',
          district: 'Cipongkor',
          regency: 'Bandung Barat',
          province: 'Jawa Barat',
          postal_code: '40564',
        },
      },
    },
  }),
}))

vi.mock('@/features/data-cpmi/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/data-cpmi/api')>()),
  getMigrantWorkerPrefill: vi.fn(),
}))

const formConfig = (code: string) =>
  present(
    getLetterTypeFormConfig({
      id: 11,
      code,
      name: 'Pendataan CPMI',
      produces_letter: false,
      data_action: 'none',
      form_fields: [
        {
          name: 'tinggi_badan',
          label: 'Tinggi Badan (cm)',
          type: 'number',
          required: true,
          section: 'Data Diri',
        },
        {
          name: 'nama_sekolah',
          label: 'Nama Sekolah',
          type: 'text',
          required: true,
          section: 'Pendidikan',
        },
        { name: 'jurusan', label: 'Jurusan', type: 'text', required: false, section: 'Pendidikan' },
      ],
    }),
    'konfigurasi jenis surat',
  )

describe('DynamicSuratForm sections', () => {
  beforeEach(() => {
    vi.mocked(getMigrantWorkerPrefill).mockResolvedValue({})
  })

  it('separates fields per section and shows the full identity in the first one', () => {
    render(<DynamicSuratForm config={formConfig('X99')} onSubmitAPI={vi.fn()} />)

    const headings = screen.getAllByRole('heading', { level: 4 }).map((node) => node.textContent)
    expect(headings).toEqual(['Data Diri', 'Pendidikan'])

    expect(screen.getByText('Cianjur, 17 Mei 2000')).toBeInTheDocument()
    expect(screen.getByText('Aminah Binti Karta')).toBeInTheDocument()
    expect(screen.getByText('Bandung Barat')).toBeInTheDocument()
    expect(screen.getByText('40564')).toBeInTheDocument()
    // Ringkasan profil biasa diganti kartu data diri.
    expect(screen.queryByLabelText(/Nama Pemohon \(otomatis\)/)).not.toBeInTheDocument()
    // Bukan pendataan CPMI: tidak memuat riwayat.
    expect(getMigrantWorkerPrefill).not.toHaveBeenCalled()
  })

  it('prefills empty fields from the previous CPMI record', async () => {
    vi.mocked(getMigrantWorkerPrefill).mockResolvedValue({
      nama_sekolah: 'SMK Negeri 1',
      tinggi_badan: 160,
      negara_bukan_isian: 'Taiwan',
    })

    render(<DynamicSuratForm config={formConfig('F11')} onSubmitAPI={vi.fn()} />)

    await waitFor(() => expect(screen.getByLabelText(/Nama Sekolah/)).toHaveValue('SMK Negeri 1'))
    expect(screen.getByLabelText(/Tinggi Badan/)).toHaveValue('160')
    expect(screen.getByLabelText(/Jurusan/)).toHaveValue('')
    expect(screen.getByRole('status')).toHaveTextContent('pendataan CPMI Anda sebelumnya')
  })
})
