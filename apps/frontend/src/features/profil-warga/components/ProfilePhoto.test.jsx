import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProfilePhoto } from './ProfilePhoto'

const auth = vi.hoisted(() => ({ user: null }))

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: auth.user, patchUser: vi.fn() }),
}))

vi.mock('../api', () => ({
  uploadOwnPhoto: vi.fn(),
  deleteOwnPhoto: vi.fn(),
}))

describe('ProfilePhoto', () => {
  beforeEach(() => {
    auth.user = { name: 'Siti', role: 'warga', photo_url: 'https://example.test/siti.jpg' }
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
})
