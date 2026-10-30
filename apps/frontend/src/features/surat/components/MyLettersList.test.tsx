import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('@/lib/api', () => ({ default: api }))

import { partialFixture } from '@/test/fixtures'
import type { LetterListItem } from '@/types'

import { MyLettersList } from './MyLettersList'

const LETTERS = partialFixture<LetterListItem[]>([
  {
    id: 'letter-1',
    status: 'in_progress',
    letter_number: null,
    created_at: '2026-10-12T08:00:00Z',
    current_step_order: 2,
    current_step: { approver_position: 'kepala_desa' },
    letter_type: { name: 'Surat Keterangan Domisili' },
  },
  {
    id: 'letter-2',
    status: 'approved',
    letter_number: '470/012/2026',
    created_at: '2026-10-01T08:00:00Z',
    letter_type: { name: 'Surat Keterangan Usaha' },
  },
])

function renderList(props = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const handlers = {
    onFilterChange: vi.fn(),
    onDetail: vi.fn(),
    onDelete: vi.fn(),
    onCreate: vi.fn(),
    onPageChange: vi.fn(),
  }

  render(
    <QueryClientProvider client={client}>
      <MyLettersList
        letters={LETTERS}
        loading={false}
        filter=""
        deletingId={null}
        page={1}
        totalPages={1}
        {...handlers}
        {...props}
      />
    </QueryClientProvider>,
  )

  return handlers
}

describe('MyLettersList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockResolvedValue({
      data: {
        data: {
          total: 5,
          by_status: { pending: 1, in_progress: 2, approved: 1, rejected: 1 },
        },
      },
    })
  })

  it('shows where each letter is in the approval route', () => {
    renderList()

    expect(screen.getByText('Menunggu persetujuan Kepala Desa.')).toBeTruthy()
    expect(screen.getAllByRole('list', { name: 'Tahapan surat' })[0]).toBeTruthy()
    expect(screen.getByText('No. 470/012/2026')).toBeTruthy()
  })

  it('offers download for issued letters and hides their delete action', () => {
    const { onDetail, onDelete } = renderList()

    fireEvent.click(screen.getByRole('button', { name: 'Lihat detail Surat Keterangan Usaha' }))
    expect(onDetail).toHaveBeenCalledWith(LETTERS[1])
    expect(screen.getByRole('button', { name: /^Unduh/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Hapus Surat Keterangan Usaha' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Hapus Surat Keterangan Domisili' }))
    expect(onDelete).toHaveBeenCalledWith(LETTERS[0])
  })

  it('shows status counts from the own-letter summary and filters by status', async () => {
    const { onFilterChange } = renderList()

    expect(await screen.findByText('5')).toBeTruthy()
    expect(api.get).toHaveBeenCalledWith('/api/letters/summary', { params: { scope: 'mine' } })

    fireEvent.click(screen.getByRole('button', { name: /Ditolak/ }))
    expect(onFilterChange).toHaveBeenCalledWith('rejected')
  })

  it('invites the user to apply when there are no letters yet', () => {
    const { onCreate } = renderList({ letters: [] })

    fireEvent.click(screen.getByRole('button', { name: 'Ajukan surat' }))
    expect(onCreate).toHaveBeenCalled()
  })
})
