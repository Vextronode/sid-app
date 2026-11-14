import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getLetterDetail, downloadSuratPDF } = vi.hoisted(() => ({
  getLetterDetail: vi.fn(),
  downloadSuratPDF: vi.fn(),
}))

const { getLetterTypes } = vi.hoisted(() => ({ getLetterTypes: vi.fn() }))

vi.mock('../api/letterExtrasApi', () => ({ getLetterDetail }))
vi.mock('../api/letterTypeApi', () => ({ getLetterTypes }))
vi.mock('./LetterExtrasPanel', () => ({ LetterExtrasPanel: (): null => null }))
vi.mock('@/features/cetak-surat/utils/generateSuratPDF', () => ({ downloadSuratPDF }))
vi.mock('@/features/cetak-surat/components/PdfCanvasPreview', () => ({
  PdfCanvasPreview: ({ surat }: { surat: { id: string } }) => (
    <div data-testid="pdf-canvas-preview">{surat.id}</div>
  ),
}))

import { DetailSuratModal } from './DetailSuratModal'
import type { Letter, LetterListItem } from '@/types'
import { partialFixture } from '@/test/fixtures'
import type { DeepPartial } from '@/test/fixtures'

// Baris daftar; approvals ikut bila detail surat sudah digabung.
function renderModal(
  data: DeepPartial<LetterListItem & Pick<Letter, 'approvals'>>,
  onReapply?: (code: string) => void,
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <DetailSuratModal
        data={partialFixture<LetterListItem>(data)}
        onClose={vi.fn()}
        onReapply={onReapply}
      />
    </QueryClientProvider>,
  )
}

const approvedLetter = {
  id: 'letter-1',
  status: 'approved' as const,
  letter_number: '470/001',
  current_step_order: 3,
  letter_type: { name: 'Surat Keterangan Domisili', code: 'SKD' },
}

describe('DetailSuratModal (pemohon)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getLetterDetail.mockImplementation(() => new Promise(() => {}))
    getLetterTypes.mockResolvedValue([{ id: 1, code: 'SKD', name: 'Surat Keterangan Domisili' }])
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
      rejection_reason: 'Foto KTP buram.',
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

  it('offers "Ajukan lagi" for an expired letter whose type can still be applied for', async () => {
    const user = userEvent.setup()
    const onReapply = vi.fn()
    renderModal(
      { ...approvedLetter, expires_at: '2026-01-10T00:00:00Z', is_expired: true },
      onReapply,
    )

    await user.click(await screen.findByRole('button', { name: 'Ajukan lagi' }))

    expect(onReapply).toHaveBeenCalledWith('SKD')
    expect(getLetterTypes).toHaveBeenCalledTimes(1)
  })

  it('hides "Ajukan lagi" when the letter type is no longer available', async () => {
    getLetterTypes.mockResolvedValue([{ id: 2, code: 'SKU', name: 'Surat Keterangan Usaha' }])
    renderModal(
      { ...approvedLetter, expires_at: '2026-01-10T00:00:00Z', is_expired: true },
      vi.fn(),
    )

    await waitFor(() => expect(getLetterTypes).toHaveBeenCalled())
    // Tunggu daftar jenis surat selesai dimuat sebelum memastikan tombol tidak ada.
    await act(() => getLetterTypes.mock.results[0].value)
    expect(screen.queryByRole('button', { name: 'Ajukan lagi' })).toBeNull()
  })

  it('does not load letter types or offer "Ajukan lagi" for a valid letter', () => {
    renderModal(
      { ...approvedLetter, expires_at: '2099-01-10T00:00:00Z', is_expired: false },
      vi.fn(),
    )

    expect(screen.queryByRole('button', { name: 'Ajukan lagi' })).toBeNull()
    expect(getLetterTypes).not.toHaveBeenCalled()
  })
})
