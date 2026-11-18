import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MigrantWorkerSummary } from '../api'

const api = vi.hoisted(() => ({
  MIGRANT_WORKER_LETTER_CODE: 'F11',
  getMyMigrantWorkers: vi.fn(),
  getMigrantWorker: vi.fn(),
}))
const auth = vi.hoisted(() => ({ role: 'warga' }))

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-1', role: auth.role } }),
}))
vi.mock('../api', () => api)

import { CpmiSayaCard } from './CpmiSayaCard'

function worker(overrides: Partial<MigrantWorkerSummary> = {}): MigrantWorkerSummary {
  return {
    id: 'mw-1',
    letter_id: 'l-1',
    citizen: { id: 'c-1', name: 'Siti Aminah' },
    hamlet: 'Sukamaju',
    destination_country: 'Taiwan',
    employer_name: 'Chen Family',
    agency_name: 'PT Sinar Abadi',
    position: 'Caregiver',
    contract_start: '2027-03-01',
    contract_end: '2030-02-28',
    contract_status: 'akan_berangkat',
    approved_at: '2026-11-18T03:00:00Z',
    created_at: '2026-11-18T03:00:00Z',
    ...overrides,
  }
}

function renderCard() {
  return render(
    <MemoryRouter>
      <CpmiSayaCard />
    </MemoryRouter>,
  )
}

describe('CpmiSayaCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.role = 'warga'
  })

  it('stays hidden for accounts that were never registered', async () => {
    api.getMyMigrantWorkers.mockResolvedValue([])
    const { container } = renderCard()

    await waitFor(() => expect(api.getMyMigrantWorkers).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('lists each departure and opens its details on demand', async () => {
    api.getMyMigrantWorkers.mockResolvedValue([
      worker(),
      worker({ id: 'mw-0', destination_country: 'Malaysia', contract_status: 'berakhir' }),
    ])
    api.getMigrantWorker.mockResolvedValue({
      ...worker(),
      employer_contact: '+886 2 1234 5678',
      salary_facilities: 'NTD 20.000/bulan',
      guardian_name: 'Aminah',
      guardian_relation: 'ibu',
      guardian_relation_label: 'Ibu',
      guardian_phone: '081298765432',
      phone: '081234567890',
      email: null,
      documents: Array.from({ length: 10 }, (_, index) => ({ id: index })),
    })

    renderCard()

    expect(await screen.findByText(/Taiwan · Caregiver/)).toBeInTheDocument()
    expect(screen.getByText(/Malaysia/)).toBeInTheDocument()
    expect(screen.getByText('Akan berangkat')).toBeInTheDocument()
    expect(screen.getByText('Kontrak berakhir')).toBeInTheDocument()
    expect(api.getMigrantWorker).not.toHaveBeenCalled()

    fireEvent.click(screen.getAllByRole('button', { name: 'Lihat rincian' })[0])

    expect(await screen.findByText('Aminah (Ibu) · 081298765432')).toBeInTheDocument()
    expect(screen.getByText('10 berkas')).toBeInTheDocument()
    expect(api.getMigrantWorker).toHaveBeenCalledWith('mw-1')
  })

  it('sends citizens straight to the F11 form and officials to Surat Saya', async () => {
    api.getMyMigrantWorkers.mockResolvedValue([worker()])
    const { unmount } = renderCard()

    expect(await screen.findByRole('link', { name: 'Daftar CPMI lagi' })).toHaveAttribute(
      'href',
      '/pengajuan-surat/F11',
    )
    unmount()

    auth.role = 'kasi_pemerintahan'
    renderCard()

    expect(await screen.findByRole('link', { name: 'Daftar CPMI lagi' })).toHaveAttribute(
      'href',
      '/admin/surat-saya',
    )
  })
})
