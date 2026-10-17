import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getPopulationLogs, getLetterActivityLogs } = vi.hoisted(() => ({
  getPopulationLogs: vi.fn(),
  getLetterActivityLogs: vi.fn(),
}))

vi.mock('@/features/activity-log/api', () => ({ getPopulationLogs, getLetterActivityLogs }))
vi.mock('@/components/layout/SiteFooter', () => ({ SiteFooter: () => null }))

import ActivityLogPage from './ActivityLogPage'

function renderPage(entry = '/admin/log-aktivitas') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <ActivityLogPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const actor = { id: 'u1', name: 'Petugas Desa', role: 'staf_sid', role_label: 'Staf SIDUTama' }

describe('ActivityLogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPopulationLogs.mockResolvedValue({
      data: [
        {
          id: 1,
          log_name: 'citizen',
          event: 'updated',
          subject_id: 'c1',
          subject_label: 'Siti Aminah',
          changes: {
            name: { old: 'Siti', new: 'Siti Aminah' },
            nik: { old: '(disamarkan)', new: '(disamarkan)' },
          },
          actor,
          created_at: '2026-10-18T03:00:00Z',
        },
      ],
      meta: { current_page: 1, last_page: 1, total: 1 },
    })
    getLetterActivityLogs.mockResolvedValue({
      data: [
        {
          id: 9,
          letter: {
            id: 'l1',
            letter_number: '470/001',
            applicant_name: 'Budi',
            letter_type: 'SKD',
          },
          actor,
          old_status: 'pending',
          new_status: 'rejected',
          reason: 'Data kurang',
          created_at: '2026-10-18T03:00:00Z',
        },
      ],
      meta: { current_page: 1, last_page: 1, total: 1 },
    })
  })

  it('shows population changes with field labels and masked values', async () => {
    renderPage()

    expect(await screen.findByText('Siti Aminah', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('Diubah', { selector: 'td span' })).toBeInTheDocument()
    expect(screen.getByText('Nama:')).toBeInTheDocument()
    expect(screen.getByText('NIK:').parentElement).toHaveTextContent('(disamarkan) → (disamarkan)')
    expect(screen.getByText('Staf SIDUTama')).toBeInTheDocument()
  })

  it('applies the subject filter from the URL and lets it be cleared', async () => {
    renderPage('/admin/log-aktivitas?tab=penduduk&type=citizen&subject=c1')

    await waitFor(() =>
      expect(getPopulationLogs).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'citizen', subject_id: 'c1', page: 1 }),
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: /Tampilkan semua/ }))

    await waitFor(() =>
      expect(getPopulationLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ subject_id: '' }),
      ),
    )
  })

  it('switches to the letter tab and filters by status', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('tab', { name: 'Surat' }))

    expect(await screen.findByRole('link', { name: '#470/001' })).toHaveAttribute(
      'href',
      '/admin/operator-desa/surat?surat=l1',
    )
    expect(screen.getByText('Menunggu → Ditolak')).toBeInTheDocument()
    expect(screen.getByText('Data kurang')).toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue('Semua status'), { target: { value: 'rejected' } })

    await waitFor(() =>
      expect(getLetterActivityLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ new_status: 'rejected' }),
      ),
    )
  })
})
