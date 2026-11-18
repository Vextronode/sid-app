import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DynamicSuratForm } from './DynamicSuratForm'
import { getLetterTypeFormConfig } from '../utils/letterTypeConfig'
import { present } from '@/test/fixtures'

const auth = vi.hoisted(() => ({ gender: 'L', marital: 'kawin' }))
const { getFamilyMembers } = vi.hoisted(() => ({ getFamilyMembers: vi.fn() }))

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      name: 'Engkos',
      role: 'warga',
      citizen: { name: 'Engkos', gender: auth.gender, marital_status: auth.marital },
    },
  }),
}))
vi.mock('../api/letterExtrasApi', () => ({
  getFamilyMembers,
  getVillageAreas: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/features/data-cpmi/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/data-cpmi/api')>()),
  getMigrantWorkerPrefill: vi.fn().mockResolvedValue({}),
}))

const married = { field: 'status_perkawinan', in: ['kawin', 'kawin_belum_tercatat'] }
const spouseOf = (gender: string) => ({
  all: [{ field: 'jenis_kelamin_pemohon', equals: gender }, married],
})

// Bagian Kontak Darurat form F11 (ServiceLetterTypeSeeder::migrantWorkerType).
const config = present(
  getLetterTypeFormConfig({
    id: 11,
    code: 'F11',
    name: 'Pendataan CPMI',
    produces_letter: false,
    data_action: 'none',
    form_fields: [
      {
        name: 'status_perkawinan',
        label: 'Status Perkawinan',
        type: 'select',
        required: true,
        options: [{ value: 'belum_kawin' }, { value: 'kawin' }],
        from_applicant: {
          column: 'marital_status',
          map: { belum_kawin: 'belum_kawin', kawin: 'kawin' },
        },
      },
      {
        name: 'jenis_kelamin_pemohon',
        label: 'Jenis Kelamin',
        type: 'select',
        required: true,
        options: [{ value: 'L' }, { value: 'P' }],
        from_applicant: { column: 'gender', map: { L: 'L', P: 'P' } },
      },
      {
        name: 'penanggung_jawab_sumber',
        label: 'Penanggung Jawab Diambil dari',
        type: 'select',
        required: true,
        options: [
          { value: 'kk', label: 'Anggota KK saya' },
          { value: 'luar_kk', label: 'Di luar KK' },
        ],
      },
      {
        name: 'penanggung_jawab_anggota',
        label: 'Anggota KK',
        type: 'family_member',
        required: true,
        not_self: true,
        relation_hint: true,
        visible_when: { field: 'penanggung_jawab_sumber', equals: 'kk' },
      },
      {
        name: 'penanggung_jawab_hubungan',
        label: 'Hubungan dengan Anda',
        type: 'select',
        required: true,
        visible_when: { field: 'penanggung_jawab_sumber', equals: 'luar_kk' },
        options: [
          { value: 'suami', label: 'Suami', visible_when: spouseOf('P') },
          { value: 'istri', label: 'Istri', visible_when: spouseOf('L') },
          { value: 'ayah', label: 'Ayah' },
          { value: 'ibu', label: 'Ibu' },
        ],
      },
    ],
  }),
  'konfigurasi jenis surat',
)

const relationOptions = () =>
  within(screen.getByLabelText(/Hubungan dengan Anda/))
    .getAllByRole('option')
    .map((option) => option.textContent)
    .filter((label) => label !== 'Pilih...')

describe('DynamicSuratForm CPMI emergency contact', () => {
  beforeEach(() => {
    auth.gender = 'L'
    auth.marital = 'kawin'
    getFamilyMembers.mockResolvedValue([
      {
        id: 'self',
        name: 'Engkos',
        family_role: 'kepala_keluarga',
        family_role_label: 'Kepala Keluarga',
        gender: 'L',
        is_self: true,
      },
      {
        id: 'c-2',
        name: 'Imas',
        family_role: 'istri',
        family_role_label: 'Istri',
        gender: 'P',
        is_self: false,
      },
    ])
  })

  it('offers only the spouse that matches a married applicant outside the family card', () => {
    render(<DynamicSuratForm config={config} onSubmitAPI={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/Penanggung Jawab Diambil dari/), {
      target: { value: 'luar_kk' },
    })

    expect(relationOptions()).toEqual(['Istri', 'Ayah', 'Ibu'])
  })

  it('hides both spouses for an unmarried applicant', () => {
    auth.marital = 'belum_kawin'
    render(<DynamicSuratForm config={config} onSubmitAPI={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/Penanggung Jawab Diambil dari/), {
      target: { value: 'luar_kk' },
    })

    expect(relationOptions()).toEqual(['Ayah', 'Ibu'])
  })

  it('fills the relation from the family card for a member chosen from it', async () => {
    render(<DynamicSuratForm config={config} onSubmitAPI={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/Penanggung Jawab Diambil dari/), {
      target: { value: 'kk' },
    })

    await screen.findByRole('option', { name: 'Imas (Istri)' })
    fireEvent.change(screen.getByLabelText(/Anggota KK/), { target: { value: 'c-2' } })

    expect(await screen.findByText(/Hubungan dengan Anda \(dari data KK\)/)).toHaveTextContent(
      'Istri',
    )
    expect(screen.queryByLabelText(/Hubungan dengan Anda/)).toBeNull()
  })
})
