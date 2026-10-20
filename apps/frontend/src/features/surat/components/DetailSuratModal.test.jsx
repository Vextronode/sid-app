import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getLetterDetail, downloadSuratPDF } = vi.hoisted(() => ({
  getLetterDetail: vi.fn(),
  downloadSuratPDF: vi.fn(),
}))

vi.mock('../api/letterExtrasApi', () => ({ getLetterDetail }))
vi.mock('./LetterExtrasPanel', () => ({ LetterExtrasPanel: () => null }))
vi.mock('@/features/cetak-surat/utils/generateSuratPDF', () => ({ downloadSuratPDF }))
vi.mock('@/features/cetak-surat/components/PdfCanvasPreview', () => ({
  PdfCanvasPreview: ({ surat }) => <div data-testid="pdf-canvas-preview">{surat.id}</div>,
}))

import { DetailSuratModal } from './DetailSuratModal'

function renderModal(data) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <DetailSuratModal data={data} onClose={vi.fn()} />
    </QueryClientProvider>,
  )
}

const approvedLetter = {
  id: 'letter-1',
  status: 'approved',
  letter_number: '470/001',
  current_step_order: 3,
  letter_type: { name: 'Surat Keterangan Domisili' },
}

describe('DetailSuratModal (pemohon)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getLetterDetail.mockImplementation(() => new Promise(() => {}))
  })

  it('keeps the download disabled and hides the preview for an expired letter', () => {
    renderModal({ ...approvedLetter, expires_at: '2026-01-10T00:00:00Z', is_expired: true })

    expect(screen.getByText('Kedaluwarsa')).toBeInTheDocument()
    expect(screen.getAllByText(/tidak dapat/).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Unduh surat/ })).toBeDisabled()
    expect(screen.queryByTestId('pdf-canvas-preview')).toBeNull()
  })

  it('shows the preview, validity date and download for a letter still valid', () => {
    renderModal({ ...approvedLetter, expires_at: '2099-01-10T00:00:00Z', is_expired: false })

    expect(screen.getByRole('heading', { name: 'Surat Keterangan Domisili' })).toBeInTheDocument()
    expect(screen.getByText(/Berlaku sampai/)).toBeInTheDocument()
    expect(screen.queryByText('Kedaluwarsa')).toBeNull()
    expect(screen.getByRole('button', { name: /Unduh surat/ })).toBeEnabled()
    expect(screen.getByTestId('pdf-canvas-preview')).toHaveTextContent('letter-1')
  })

  it('shows the rejection reason and no download for a rejected letter', () => {
    renderModal({
      ...approvedLetter,
      status: 'rejected',
      rejected_at_step: 1,
      notes: 'Foto KTP buram.',
    })

    expect(screen.getByRole('heading', { name: 'Alasan penolakan' })).toBeInTheDocument()
    expect(screen.getByText('Foto KTP buram.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Unduh surat/ })).toBeNull()
    expect(screen.queryByTestId('pdf-canvas-preview')).toBeNull()
  })

  it('shows generic progress without approver names while the letter is processed', () => {
    renderModal({
      ...approvedLetter,
      status: 'in_progress',
      current_step_order: 2,
      approvals: [
        { id: 1, approval_level: 'rt', action: 'approved', approver_name: 'Rudi Nugraha' },
      ],
    })

    expect(screen.getByText('Surat sedang diproses.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Progres' })).toBeInTheDocument()
    expect(screen.queryByText(/Rudi Nugraha/)).toBeNull()
    expect(screen.queryByRole('button', { name: /Unduh surat/ })).toBeNull()
  })
})
