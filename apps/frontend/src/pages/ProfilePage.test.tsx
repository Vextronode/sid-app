import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import api from '@/lib/api'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { partialFixture } from '@/test/fixtures'
import type { User } from '@/types'
import ProfilePage from './ProfilePage'
import AdminProfilePage from './admin/AdminProfilePage'

vi.mock('@/lib/api', () => ({ default: { patch: vi.fn() } }))
vi.mock('@/features/auth/contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('@/components/layout/WargaLayout', () => ({
  WargaLayout: ({ children }) => <div>{children}</div>,
}))
vi.mock('@/components/layout/OfficialLayout', () => ({
  OfficialLayout: ({ children }) => <div>{children}</div>,
}))
vi.mock('@/components/layout/SiteFooter', () => ({ SiteFooter: () => null }))
vi.mock('@/features/profil-warga/components/ProfilePhoto', () => ({ ProfilePhoto: () => null }))
vi.mock('@/features/surat/components/SignatureCard', () => ({ SignatureCard: () => null }))
vi.mock('@/features/surat/components/SignatureRequestsCard', () => ({
  SignatureRequestsCard: () => null,
}))

const mockedUseAuth = vi.mocked(useAuth, { partial: true, deep: true })
const mockedPatch = vi.mocked(api.patch, { partial: true, deep: true })

const user = partialFixture<User>({ id: 'user-1', name: 'Siti', username: 'siti', email: null })

describe.each([
  ['ProfilePage', ProfilePage],
  ['AdminProfilePage', AdminProfilePage],
])('%s account settings', (_, Page) => {
  const patchUser = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseAuth.mockReturnValue({ user, patchUser })
  })

  // Regresi: halaman dulu memanggil setUser yang tidak ada di AuthContext,
  // sehingga username/email baru tidak tampil sampai halaman dimuat ulang.
  it('shows the saved username right away by updating the session user', async () => {
    const updated = { ...user, username: 'siti.baru' }
    mockedPatch.mockResolvedValue({
      data: { message: 'Profil berhasil diperbarui.', user: updated },
    })

    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Pengaturan Akun/ }))
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'siti.baru' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Username & Email' }))

    await waitFor(() => expect(patchUser).toHaveBeenCalledWith(updated))
  })
})
