import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { useLetters } from '@/features/surat/hooks/useLetters'
import { partialFixture } from '@/test/fixtures'
import type { LetterListItem } from '@/types'

import SuratDateTracker from './SuratDateTracker'

vi.mock('@/features/surat/hooks/useLetters', () => ({ useLetters: vi.fn() }))
vi.mock('@/features/cetak-surat/components/PdfCanvasPreview', () => ({
  PdfCanvasPreview: (): null => null,
}))

const mockedUseLetters = vi.mocked(useLetters, { partial: true, deep: true })

function renderWith(letter: LetterListItem) {
  mockedUseLetters.mockReturnValue({
    letters: [letter],
    meta: { current_page: 1, per_page: 1, total: 1, last_page: 1 },
    loading: false,
  })

  render(
    <MemoryRouter>
      <SuratDateTracker />
    </MemoryRouter>,
  )
}

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
