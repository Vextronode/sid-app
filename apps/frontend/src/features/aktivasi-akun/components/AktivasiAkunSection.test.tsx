import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getAccountRegistrations: vi.fn(),
  getAccountRegistrationPhotoUrl: vi.fn(),
  approveAccountRegistration: vi.fn(),
  rejectAccountRegistration: vi.fn(),
  manualActivateAccount: vi.fn(),
}))
const dialog = vi.hoisted(() => ({ confirmDialog: vi.fn(), promptDialog: vi.fn() }))

vi.mock('@/features/aktivasi-akun/api', () => api)
vi.mock('@/shared/lib/dialog', () => dialog)
vi.mock('@/shared/lib/toast', () => ({ notifySuccess: vi.fn() }))
vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'rt-1', role: 'rt' } }),
}))

import { partialFixture } from '@/test/fixtures'
import type { AccountRegistration } from '@/features/aktivasi-akun/api'

import { AktivasiAkunSection } from './AktivasiAkunSection'

const PENDING = partialFixture<AccountRegistration>({
  id: 7,
  status: 'pending',
  method: 'online',
  citizen: { name: 'Ujang Pendaftar', nik_masked: '************0001' },
  username: 'ujang.1234',
  area: { rt: '003', rw: '002', hamlet: 'Patrol' },
  level: 'rt',
  can_decide: true,
  can_manual_activate: false,
  has_photo: true,
  rejection_count: 0,
  banned: false,
})

describe('AktivasiAkunSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getAccountRegistrations.mockResolvedValue({
      data: [PENDING],
      meta: { current_page: 1, last_page: 1, total: 1 },
    })
    api.getAccountRegistrationPhotoUrl.mockResolvedValue('blob:foto-wajah')
    api.rejectAccountRegistration.mockResolvedValue({
      data: { message: 'Pendaftaran akun ditolak.' },
    })
  })

  it('opens the photo in the detail before deciding', async () => {
    render(<AktivasiAkunSection />)

    fireEvent.click(
      await screen.findByRole('button', { name: 'Periksa pendaftaran Ujang Pendaftar' }),
    )

    expect((await screen.findByAltText('Foto wajah Ujang Pendaftar')).getAttribute('src')).toBe(
      'blob:foto-wajah',
    )
    expect(api.getAccountRegistrationPhotoUrl).toHaveBeenCalledWith(7)
    fireEvent.click(screen.getByRole('button', { name: 'Perbesar foto' }))
    expect(screen.getByRole('button', { name: 'Perkecil foto' })).toBeTruthy()
  })

  it('requires a note to reject and sends it', async () => {
    dialog.promptDialog.mockResolvedValue('Foto wajah tidak jelas')
    render(<AktivasiAkunSection />)

    fireEvent.click(
      await screen.findByRole('button', { name: 'Periksa pendaftaran Ujang Pendaftar' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Tolak' }))

    await waitFor(() =>
      expect(api.rejectAccountRegistration).toHaveBeenCalledWith(7, 'Foto wajah tidak jelas'),
    )
    expect(dialog.promptDialog).toHaveBeenCalledWith(expect.objectContaining({ minLength: 5 }))
  })

  it('filters by status', async () => {
    render(<AktivasiAkunSection />)
    await screen.findByText('Ujang Pendaftar')

    fireEvent.change(screen.getByRole('combobox', { name: 'Filter status pendaftaran' }), {
      target: { value: 'rejected' },
    })

    await waitFor(() =>
      expect(api.getAccountRegistrations).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'rejected' }),
      ),
    )
  })
})
