import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getProfilePhotoRequests: vi.fn(),
  getProfilePhotoRequestPhotoUrl: vi.fn(),
  approveProfilePhotoRequest: vi.fn(),
  rejectProfilePhotoRequest: vi.fn(),
}))
const dialog = vi.hoisted(() => ({ confirmDialog: vi.fn(), promptDialog: vi.fn() }))

vi.mock('../api', () => api)
vi.mock('@/shared/lib/dialog', () => dialog)
vi.mock('@/shared/lib/toast', () => ({ notifySuccess: vi.fn() }))
vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'rt-1', role: 'rt' } }),
}))

import { partialFixture } from '@/test/fixtures'
import type { ProfilePhotoRequest } from '../api'

import { FotoProfilRequestSection } from './FotoProfilRequestSection'

const PENDING = partialFixture<ProfilePhotoRequest>({
  id: 4,
  status: 'pending',
  user: {
    name: 'Siti Warga',
    username: 'siti.1234',
    nik_masked: '************0002',
    current_photo_url: 'https://example.test/lama.jpg',
  },
  area: { rt: '003', rw: '002', hamlet: 'Patrol' },
  level: 'rt',
  can_decide: true,
  has_photo: true,
})

describe('FotoProfilRequestSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getProfilePhotoRequests.mockResolvedValue({
      data: [PENDING],
      meta: { current_page: 1, last_page: 1, total: 1 },
    })
    api.getProfilePhotoRequestPhotoUrl.mockResolvedValue('blob:foto-baru')
    api.approveProfilePhotoRequest.mockResolvedValue({
      data: { message: 'Foto profil warga diganti.' },
    })
    api.rejectProfilePhotoRequest.mockResolvedValue({
      data: { message: 'Permintaan ganti foto ditolak.' },
    })
  })

  it('shows the current photo next to the new one', async () => {
    render(<FotoProfilRequestSection />)

    fireEvent.click(await screen.findByRole('button', { name: 'Periksa foto Siti Warga' }))

    expect(screen.getByAltText('Foto profil Siti Warga saat ini').getAttribute('src')).toBe(
      'https://example.test/lama.jpg',
    )
    expect((await screen.findByAltText('Foto baru Siti Warga')).getAttribute('src')).toBe(
      'blob:foto-baru',
    )
    expect(api.getProfilePhotoRequestPhotoUrl).toHaveBeenCalledWith(4)
  })

  it('approves after confirmation', async () => {
    dialog.confirmDialog.mockResolvedValue(true)
    render(<FotoProfilRequestSection />)

    fireEvent.click(await screen.findByRole('button', { name: 'Periksa foto Siti Warga' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pasang foto' }))

    await waitFor(() => expect(api.approveProfilePhotoRequest).toHaveBeenCalledWith(4))
  })

  it('requires a note to reject', async () => {
    dialog.promptDialog.mockResolvedValue('Wajah tertutup masker')
    render(<FotoProfilRequestSection />)

    fireEvent.click(await screen.findByRole('button', { name: 'Periksa foto Siti Warga' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tolak' }))

    await waitFor(() =>
      expect(api.rejectProfilePhotoRequest).toHaveBeenCalledWith(4, 'Wajah tertutup masker'),
    )
    expect(dialog.promptDialog).toHaveBeenCalledWith(expect.objectContaining({ minLength: 5 }))
  })
})
