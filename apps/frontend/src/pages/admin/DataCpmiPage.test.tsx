import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/data-cpmi/api', () => ({
  getMigrantWorkers: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'mw-1',
        letter_id: 'l-1',
        citizen: { id: 'c-1', name: 'Engkos Sutisna' },
        hamlet: 'Patrol',
        destination_country: 'Jepang',
        employer_name: null,
        agency_name: 'PT GACOR',
        position: 'Operator',
        contract_start: '2026-11-18',
        contract_end: '2028-12-18',
        contract_status: 'aktif',
        approved_at: null,
        created_at: null,
      },
    ],
    total: 1,
    filters: { countries: ['Jepang'] },
  }),
}))
vi.mock('@/features/surat/api/letterExtrasApi', () => ({
  getVillageAreas: vi.fn().mockResolvedValue([]),
}))
// Pop up rincian = SuratDetailModal approver; di sini cukup tahu pengajuan mana yang dibuka.
vi.mock('@/features/data-cpmi/components/CpmiLetterModal', () => ({
  CpmiLetterModal: ({ letterId }: { letterId: string | null }) =>
    letterId ? <div role="dialog">Rincian pengajuan {letterId}</div> : null,
}))
vi.mock('@/components/layout/SiteFooter', () => ({ SiteFooter: () => null }))

import DataCpmiPage from './DataCpmiPage'

describe('DataCpmiPage', () => {
  it('opens the approver detail pop up of the departure from the Detail button', async () => {
    render(
      <MemoryRouter>
        <DataCpmiPage />
      </MemoryRouter>,
    )

    const detail = await screen.findByRole('button', { name: 'Detail pengajuan Engkos Sutisna' })
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(detail)

    expect(screen.getByRole('dialog')).toHaveTextContent('Rincian pengajuan l-1')
  })
})
