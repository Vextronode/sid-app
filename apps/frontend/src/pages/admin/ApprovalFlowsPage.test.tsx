import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-1', role: 'staf_sid' } }),
}))
vi.mock('@/components/layout/SiteFooter', () => ({ SiteFooter: (): null => null }))
vi.mock('@/features/surat/components/LetterTypeSettingsPanel', () => ({
  default: () => <p>Panel jenis surat</p>,
}))
vi.mock('@/features/surat/components/ExpiryReminderSettingsPanel', () => ({
  default: () => <p>Panel pengingat</p>,
}))
vi.mock('@/features/approval/api', () => ({
  getApprovalFlows: () =>
    Promise.resolve({
      data: {
        data: [
          {
            id: 1,
            name: 'RT-Kades/Sekdes (2 Tahap)',
            description: 'Flow default 2 tahap: RT -> Kepala Desa. RW menerima notifikasi FYI.',
            steps: [
              { id: 1, step_order: 1, approver_position: 'rt', is_final: false },
              { id: 2, step_order: 2, approver_position: 'kepala_desa', is_final: true },
            ],
          },
        ],
      },
    }),
}))

import ApprovalFlowsPage from './ApprovalFlowsPage'

function renderPage(initialEntry = '/admin/alur-persetujuan') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ApprovalFlowsPage />
    </MemoryRouter>,
  )
}

describe('ApprovalFlowsPage', () => {
  it('shows each approval step once with who gets notified', async () => {
    renderPage()

    const steps = await screen.findAllByRole('listitem')
    expect(steps).toHaveLength(2)

    expect(within(steps[0]).getByText('Ketua RT')).toBeInTheDocument()
    expect(
      within(steps[0]).getByText('Ketua RW dan Kepala Dusun mendapat pemberitahuan.'),
    ).toBeInTheDocument()

    expect(within(steps[1]).getByText('Kepala Desa / Sekretaris Desa')).toBeInTheDocument()
    expect(within(steps[1]).getByText('Persetujuan akhir')).toBeInTheDocument()

    // Nama dan deskripsi teknis satu-satunya alur tidak diulang di kartu.
    expect(screen.queryByText('RT-Kades/Sekdes (2 Tahap)')).toBeNull()
    expect(screen.queryByText(/FYI/)).toBeNull()
  })

  it('opens the flow tab by default without the reminder panel below it', async () => {
    renderPage()

    expect(await screen.findByRole('tab', { name: 'Alur & Jenis Surat' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Pengingat Masa Berlaku' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Alur & Jenis Surat')
    expect(screen.getByText('Panel jenis surat')).toBeInTheDocument()
    expect(screen.queryByText('Panel pengingat')).toBeNull()
  })

  it('shows only the reminder panel after switching to its tab', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('tab', { name: 'Pengingat Masa Berlaku' }))

    expect(screen.getByRole('tab', { name: 'Pengingat Masa Berlaku' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Pengingat Masa Berlaku')
    expect(screen.getByText('Panel pengingat')).toBeInTheDocument()
    expect(screen.queryByText('Panel jenis surat')).toBeNull()
    expect(screen.queryByText('Urutan Persetujuan')).toBeNull()
  })

  it('opens the reminder tab directly from ?tab=pengingat', async () => {
    renderPage('/admin/alur-persetujuan?tab=pengingat')

    expect(await screen.findByText('Panel pengingat')).toBeInTheDocument()
    expect(screen.queryByText('Panel jenis surat')).toBeNull()
  })
})
