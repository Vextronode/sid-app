import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  demotePerangkatDesa: vi.fn(),
  deleteOfficialPhoto: vi.fn(),
  deletePerangkatDesa: vi.fn(),
  findOfficialCandidate: vi.fn(),
  getOfficialPositionTypes: vi.fn(),
  getPerangkatDesa: vi.fn(),
  promotePerangkatDesa: vi.fn(),
  rotatePerangkatDesa: vi.fn(),
  uploadOfficialPhoto: vi.fn(),
}))

const wilayahApi = vi.hoisted(() => ({
  getRts: vi.fn(),
  getRws: vi.fn(),
  getHamlets: vi.fn(),
}))

vi.mock('@/features/profil-desa-admin/api', () => api)
vi.mock('@/features/kelola-wilayah/api', () => wilayahApi)
vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'staf-1', role: 'staf_sid' } }),
}))
vi.mock('@/components/layout/SiteFooter', () => ({ SiteFooter: (): null => null }))

import PejabatDesaPage from './PejabatDesaPage'
import { present } from '@/test/fixtures'

const official = (overrides: Record<string, unknown>) => ({
  id: Math.random(),
  is_active: true,
  rt_id: null as number | null,
  rw_id: null as number | null,
  hamlet_id: null as number | null,
  citizen: { name: 'Pejabat' },
  ...overrides,
})

const ACCOUNT_POSITIONS = [
  { code: 'kepala_desa', label: 'Kepala Desa', scope: null },
  { code: 'sekretaris_desa', label: 'Sekretaris Desa', scope: null },
  { code: 'rt', label: 'Ketua RT', scope: 'rt_id' },
  { code: 'staf_sid', label: 'Staf SIDUTama', scope: null },
]

const POSITION_TYPES = [
  { id: 1, code: 'kasi_trantib', label: 'Kasi Trantib', is_active: true, is_single_occupant: true },
  { id: 2, code: 'staf_umum', label: 'Staf Umum', is_active: true, is_single_occupant: false },
]

const OFFICIALS = [
  official({ position: 'kepala_desa', position_label: 'Kepala Desa' }),
  official({ position: 'staf_sid', position_label: 'Staf SIDUTama' }),
  official({ position: 'rt', position_label: 'Ketua RT', rt_id: 11, rw_id: 5 }),
  official({ position: 'kasi_trantib', position_label: 'Kasi Trantib' }),
  official({ position: 'staf_umum', position_label: 'Staf Umum' }),
  // Riwayat tidak menahan jabatan.
  official({ position: 'sekretaris_desa', position_label: 'Sekretaris Desa', is_active: false }),
]

const openPromotion = async () => {
  const user = userEvent.setup()
  render(<PejabatDesaPage />)
  await user.click(await screen.findByRole('button', { name: /Tetapkan Pejabat/ }))
  return { user, dialog: screen.getByRole('heading', { name: 'Tetapkan Pejabat' }).closest('form') }
}

const option = (scope: HTMLElement, name: string) => within(scope).getByRole('option', { name })

describe('PejabatDesaPage - Tetapkan Pejabat', () => {
  beforeEach(() => {
    api.getPerangkatDesa.mockResolvedValue({ data: { data: OFFICIALS } })
    api.getOfficialPositionTypes.mockResolvedValue({
      data: { data: POSITION_TYPES, account_positions: ACCOUNT_POSITIONS },
    })
    wilayahApi.getRts.mockResolvedValue({
      data: {
        data: [
          { id: 11, number: '001', rw_id: 5 },
          { id: 12, number: '002', rw_id: 5 },
        ],
      },
    })
    wilayahApi.getRws.mockResolvedValue({ data: { data: [{ id: 5, number: '001' }] } })
    wilayahApi.getHamlets.mockResolvedValue({ data: { data: [] } })
  })

  it('disables single positions that are already held', async () => {
    const { dialog } = await openPromotion()

    expect(option(present(dialog), 'Kepala Desa (sudah dijabat)')).toBeDisabled()
    expect(option(present(dialog), 'Staf SIDUTama (sudah dijabat)')).toBeDisabled()
    expect(option(present(dialog), 'Kasi Trantib (tanpa akun) (sudah dijabat)')).toBeDisabled()

    expect(option(present(dialog), 'Sekretaris Desa')).toBeEnabled()
    expect(option(present(dialog), 'Staf Umum (tanpa akun)')).toBeEnabled()
    // Jabatan berwilayah dicek per wilayah, bukan per jabatan.
    expect(option(present(dialog), 'Ketua RT')).toBeEnabled()
  })

  it('disables areas that already have an active holder', async () => {
    const { user, dialog } = await openPromotion()

    await user.selectOptions(
      within(present(dialog)).getByRole('combobox', { name: /Jabatan/ }),
      'rt',
    )

    expect(option(present(dialog), 'RT 001 / RW 001 (sudah ada)')).toBeDisabled()
    expect(option(present(dialog), 'RT 002 / RW 001')).toBeEnabled()
  })
})
