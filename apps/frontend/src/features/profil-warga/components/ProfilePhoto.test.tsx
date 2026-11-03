import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProfilePhoto } from './ProfilePhoto'

const auth = vi.hoisted(() => ({ user: null as Record<string, unknown> | null }))

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: auth.user, patchUser: vi.fn() }),
}))

const api = vi.hoisted(() => ({
  getOwnPhotoRequest: vi.fn(),
  submitPhotoRequest: vi.fn(),
  deleteOwnPhoto: vi.fn(),
}))

vi.mock('../api', () => api)

describe('ProfilePhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.user = { name: 'Siti', role: 'warga', photo_url: 'https://example.test/siti.jpg' }
    api.getOwnPhotoRequest.mockResolvedValue(null)
  })

  it('opens a large preview when the photo is clicked and closes it with the X button', async () => {
    const user = userEvent.setup()
    render(<ProfilePhoto avatarClassName="sid-profile-avatar" />)

    await user.click(screen.getByRole('button', { name: 'Lihat foto profil' }))

    const dialog = screen.getByRole('dialog', { name: 'Pratinjau foto profil' })
    expect(dialog.querySelector('img')).toHaveAttribute('src', 'https://example.test/siti.jpg')
    expect(screen.getByRole('button', { name: 'Tutup pratinjau foto' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Tutup pratinjau foto' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes the preview with Escape', async () => {
    const user = userEvent.setup()
    render(<ProfilePhoto avatarClassName="sid-profile-avatar" />)

    await user.click(screen.getByRole('button', { name: 'Lihat foto profil' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('has nothing to preview without a photo', () => {
    auth.user = { name: 'Siti', role: 'warga', photo_url: null }
    render(<ProfilePhoto avatarClassName="sid-profile-avatar" />)

    expect(screen.queryByRole('button', { name: 'Lihat foto profil' })).not.toBeInTheDocument()
  })

  it('opens the camera instead of a file picker to request a new photo', async () => {
    const user = userEvent.setup()
    render(<ProfilePhoto avatarClassName="sid-profile-avatar" />)

    await user.click(screen.getByRole('button', { name: 'Ganti foto' }))

    const dialog = screen.getByRole('dialog', { name: 'Ganti Foto Profil' })
    expect(dialog.querySelector('input[type="file"]')).toBeNull()
    expect(screen.getByRole('button', { name: /Buka kamera/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Kirim permintaan' })).toBeDisabled()
  })

  it('shows a pending request and blocks another one', async () => {
    api.getOwnPhotoRequest.mockResolvedValue({ id: 1, status: 'pending', decision_notes: null })
    render(<ProfilePhoto avatarClassName="sid-profile-avatar" />)

    expect(await screen.findByText('Foto baru menunggu persetujuan petugas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ganti foto' })).toBeDisabled()
  })

  it('shows the note of a rejected request', async () => {
    api.getOwnPhotoRequest.mockResolvedValue({
      id: 1,
      status: 'rejected',
      decision_notes: 'Wajah tertutup masker',
    })
    render(<ProfilePhoto avatarClassName="sid-profile-avatar" />)

    expect(await screen.findByText('Ganti foto ditolak: Wajah tertutup masker')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ganti foto' })).toBeEnabled()
  })
})
