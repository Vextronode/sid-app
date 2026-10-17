import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useAuth, useNotifications, reload } = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useNotifications: vi.fn(),
  reload: vi.fn(),
}))

vi.mock('@/features/auth/contexts/AuthContext', () => ({ useAuth }))
vi.mock('@/features/kelola-wilayah/hooks/WilayahMasterProvider', () => ({
  WilayahMasterProvider: ({ children }) => children,
}))
vi.mock('@/features/notifikasi/hooks/useNotifications', () => ({
  default: useNotifications,
}))
vi.mock('@/features/notifikasi/components/NotificationPopover-Admin', () => ({
  default: ({ open }) => (open ? <div>Notification list</div> : null),
}))

import { OperatorDesaLayout } from './OperatorDesaLayout'

describe('OperatorDesaLayout role regression', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useNotifications.mockReturnValue({ unreadCount: 2, reload })
  })

  it.each(['kasi_pelayanan', 'kaur_tu_umum'])(
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
      // mendapat menu pengelolaan milik Petugas Desa.
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
      user: { role: 'staf_sid', name: 'Petugas', role_label: 'Petugas Desa' },
      logout: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/admin/operator-desa']}>
        <OperatorDesaLayout>Operator page</OperatorDesaLayout>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Alur & Jenis Surat' })).toHaveAttribute(
      'href',
      '/admin/approval-flows',
    )
    expect(screen.getByRole('link', { name: 'Log Aktivitas' })).toHaveAttribute(
      'href',
      '/admin/log-aktivitas',
    )
  })
})
