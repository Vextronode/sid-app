import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useLetters } from '@/features/surat/hooks/useLetters'
import { partialFixture } from '@/test/fixtures'
import type { LetterListItem } from '@/types'

import SuratDateTracker from './SuratDateTracker'

const { getLetterTypes } = vi.hoisted(() => ({ getLetterTypes: vi.fn() }))

vi.mock('@/features/surat/hooks/useLetters', () => ({ useLetters: vi.fn() }))
vi.mock('@/features/surat/api/letterTypeApi', () => ({ getLetterTypes }))
vi.mock('@/features/cetak-surat/components/PdfCanvasPreview', () => ({
  PdfCanvasPreview: (): null => null,
}))

function ApplyFormStub() {
  return <p>Form pengajuan {useParams().kode}</p>
}

const mockedUseLetters = vi.mocked(useLetters, { partial: true, deep: true })

function renderWith(letter: LetterListItem) {
  mockedUseLetters.mockReturnValue({
    letters: [letter],
    meta: { current_page: 1, per_page: 1, total: 1, last_page: 1 },
    loading: false,
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/surat-saya']}>
        <Routes>
          <Route path="/surat-saya" element={<SuratDateTracker />} />
          <Route path="/pengajuan-surat/:kode" element={<ApplyFormStub />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getLetterTypes.mockResolvedValue([{ id: 1, code: 'SKD', name: 'Surat Keterangan Domisili' }])
})

describe('SuratDateTracker rejection reason', () => {
  // Regresi: alasan dulu dibaca dari surat.notes yang selalu kosong, sehingga
  // warga selalu melihat "Tidak ada catatan penolakan".
  it('shows the reason given by the approver who rejected the letter', () => {
    renderWith(
      partialFixture<LetterListItem>({
        id: 'letter-7',
        status: 'rejected',
        rejected_at_step: 1,
        rejection_reason: 'Fotokopi KK tidak terbaca.',
        submitted_at: '2026-10-20T01:00:00Z',
        letter_type: { name: 'Surat Keterangan Domisili' },
      }),
    )

    expect(screen.getByText('Fotokopi KK tidak terbaca.')).toBeInTheDocument()
  })

  it('falls back to a neutral note when the rejection has no reason', () => {
    renderWith(
      partialFixture<LetterListItem>({
        id: 'letter-8',
        status: 'rejected',
        rejected_at_step: 1,
        rejection_reason: null,
        submitted_at: '2026-10-20T01:00:00Z',
        letter_type: { name: 'Surat Keterangan Domisili' },
      }),
    )

    expect(screen.getByText('Tidak ada catatan penolakan.')).toBeInTheDocument()
  })
})

describe('SuratDateTracker expired letter', () => {
  it('sends "Ajukan lagi" to the application form of the same letter type', async () => {
    const user = userEvent.setup()
    renderWith(
      partialFixture<LetterListItem>({
        id: 'letter-9',
        status: 'approved',
        expires_at: '2026-01-10T16:59:59Z',
        is_expired: true,
        submitted_at: '2025-10-20T01:00:00Z',
        letter_type: { name: 'Surat Keterangan Domisili', code: 'SKD' },
      }),
    )

    await user.click(await screen.findByRole('button', { name: 'Ajukan lagi' }))

    expect(screen.getByText('Form pengajuan SKD')).toBeInTheDocument()
  })
})
