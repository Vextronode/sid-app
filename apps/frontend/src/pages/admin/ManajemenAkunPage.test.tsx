import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ role: 'staf_sid' }))

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-1', role: auth.role } }),
}))
vi.mock('@/components/layout/SiteFooter', () => ({ SiteFooter: (): null => null }))
vi.mock('@/features/manajemen-user/components/UserAccountsSection', () => ({
  UserAccountsSection: () => <p>section-akun</p>,
}))
vi.mock('@/features/aktivasi-akun/components/AktivasiAkunSection', () => ({
  AktivasiAkunSection: () => <p>section-aktivasi</p>,
}))
vi.mock('@/features/aktivasi-akun/components/FotoProfilRequestSection', () => ({
  FotoProfilRequestSection: () => <p>section-foto</p>,
}))

import ManajemenAkunPage from './ManajemenAkunPage'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ManajemenAkunPage />
    </MemoryRouter>,
  )
}

describe('ManajemenAkunPage', () => {
  beforeEach(() => {
    auth.role = 'staf_sid'
  })

  it('gives Staf SIDUTama three sections and switches between them', () => {
    renderAt('/admin/manajemen-user')

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Manajemen Akun',
      'Aktivasi Akun',
      'Request Ganti Foto Profil',
    ])
    expect(screen.getByText('section-akun')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Request Ganti Foto Profil' }))
    expect(screen.getByText('section-foto')).toBeInTheDocument()
  })

  it('opens the section named in the link', () => {
    renderAt('/admin/manajemen-user?bagian=aktivasi')

    expect(screen.getByRole('tab', { name: 'Aktivasi Akun' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText('section-aktivasi')).toBeInTheDocument()
  })

  it('gives RT only activation and photo requests', () => {
    auth.role = 'rt'
    renderAt('/admin/rt/manajemen-akun?bagian=akun')

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Aktivasi Akun',
      'Request Ganti Foto Profil',
    ])
    expect(screen.queryByText('section-akun')).toBeNull()
    expect(screen.getByText('section-aktivasi')).toBeInTheDocument()
  })
})
