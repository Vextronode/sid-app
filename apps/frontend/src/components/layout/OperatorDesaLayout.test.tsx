import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { useAuth, useNotifications, reload } = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useNotifications: vi.fn(),
  reload: vi.fn(),
}))

vi.mock('@/features/auth/contexts/AuthContext', () => ({ useAuth }))
vi.mock('@/features/kelola-wilayah/hooks/WilayahMasterProvider', () => ({
  WilayahMasterProvider: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('@/features/notifikasi/hooks/useNotifications', () => ({
  default: useNotifications,
}))
vi.mock('@/features/notifikasi/components/NotificationPopover', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div>Notification list</div> : null),
}))

import { OperatorDesaLayout } from './OperatorDesaLayout'
import type { ReactNode } from 'react'
import { present } from '@/test/fixtures'

describe('OperatorDesaLayout role regression', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useNotifications.mockReturnValue({ unreadCount: 2, reload })
  })

  it.each(['kasi_pemerintahan', 'kaur_tu_umum'])(
    'keeps %s on operator-desa pages and exposes notifications',
    (role) => {
      useAuth.mockReturnValue({
        user: { role, name: 'Operator', role_label: role },
        logout: vi.fn(),
      })

      render(
        <MemoryRouter initialEntries={['/admin/operator-desa']}>
          <OperatorDesaLayout>Operator page</OperatorDesaLayout>
        </MemoryRouter>,
      )

      expect(screen.getByRole('link', { name: 'Ringkasan' })).toBeTruthy()
      expect(screen.getByRole('link', { name: 'Permohonan Surat' })).toBeTruthy()
      // Kasi/Kaur boleh melihat data penduduk (khusus-baca), tetapi tidak
      // mendapat menu pengelolaan milik Staf SIDUTama.
      expect(screen.getByRole('link', { name: 'Data Penduduk' })).toBeTruthy()
      expect(screen.queryByRole('link', { name: 'Manajemen Pengguna' })).toBeNull()
      expect(screen.queryByRole('link', { name: 'Kelola Wilayah' })).toBeNull()
      expect(screen.queryByRole('link', { name: 'Alur & Jenis Surat' })).toBeNull()
      expect(screen.queryByRole('link', { name: 'Log Aktivitas' })).toBeNull()

      fireEvent.click(screen.getByTitle('Notifikasi'))

      expect(screen.getByText('Notification list')).toBeTruthy()
      expect(reload).toHaveBeenCalledOnce()
    },
  )

  it('shows the letter type configuration menu to staf_sid', () => {
    useAuth.mockReturnValue({
      user: { role: 'staf_sid', name: 'Petugas', role_label: 'Staf SIDUTama' },
      logout: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/admin/operator-desa']}>
        <OperatorDesaLayout>Operator page</OperatorDesaLayout>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Alur & Jenis Surat' })).toHaveAttribute(
      'href',
      '/admin/alur-persetujuan',
    )
    expect(screen.getByRole('link', { name: 'Log Aktivitas' })).toHaveAttribute(
      'href',
      '/admin/log-aktivitas',
    )
  })
})

describe('OperatorDesaLayout sidebar', () => {
  const originalMatchMedia = window.matchMedia

  function mockViewport(mobile: boolean) {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: mobile,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  }

  function renderLayout() {
    useAuth.mockReturnValue({
      user: { role: 'staf_sid', name: 'Petugas', role_label: 'Staf SIDUTama' },
      logout: vi.fn(),
    })

    return render(
      <MemoryRouter initialEntries={['/admin/operator-desa']}>
        <OperatorDesaLayout>Operator page</OperatorDesaLayout>
      </MemoryRouter>,
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    useNotifications.mockReturnValue({ unreadCount: 0, reload })
    window.localStorage.clear()
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('collapses and expands manually on desktop and remembers the choice', () => {
    mockViewport(false)
    const { container } = renderLayout()
    const layout = container.querySelector('.sid-operator-layout')

    expect(layout).not.toHaveClass('is-rail')

    fireEvent.click(screen.getByRole('button', { name: 'Ciutkan menu' }))
    expect(layout).toHaveClass('is-rail')
    expect(window.localStorage.getItem('sid-operator-sidebar-collapsed')).toBe('1')

    // Pindah menu tidak mengubah pilihan di desktop.
    fireEvent.click(screen.getByRole('link', { name: 'Log Aktivitas' }))
    expect(layout).toHaveClass('is-rail')

    fireEvent.click(screen.getByRole('button', { name: 'Perluas menu' }))
    expect(layout).not.toHaveClass('is-rail')
  })

  it('opens on mobile and collapses again after navigating', () => {
    mockViewport(true)
    const { container } = renderLayout()
    const layout = container.querySelector('.sid-operator-layout')

    expect(layout).toHaveClass('is-rail')

    fireEvent.click(screen.getByRole('button', { name: 'Perluas menu' }))
    expect(layout).toHaveClass('is-mobile-open')
    expect(layout).not.toHaveClass('is-rail')

    fireEvent.click(screen.getByRole('link', { name: 'Log Aktivitas' }))
    expect(layout).toHaveClass('is-rail')
    expect(layout).not.toHaveClass('is-mobile-open')
  })

  it('closes the mobile sidebar from the backdrop', () => {
    mockViewport(true)
    const { container } = renderLayout()

    fireEvent.click(screen.getByRole('button', { name: 'Perluas menu' }))
    fireEvent.click(present(container.querySelector('.sid-operator-sidebar-backdrop')))

    expect(container.querySelector('.sid-operator-layout')).toHaveClass('is-rail')
  })
})
