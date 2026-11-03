import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-1', role: 'staf_sid' } }),
}))
vi.mock('@/components/layout/SiteFooter', () => ({ SiteFooter: (): null => null }))
vi.mock('@/features/surat/components/LetterTypeSettingsPanel', () => ({
  default: (): null => null,
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

describe('ApprovalFlowsPage', () => {
  it('shows each approval step once with who gets notified', async () => {
    render(<ApprovalFlowsPage />)

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
})
