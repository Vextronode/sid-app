import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getLetterDetail, downloadSuratPDF, previewSuratPDF } = vi.hoisted(() => ({
  getLetterDetail: vi.fn(),
  downloadSuratPDF: vi.fn(),
  previewSuratPDF: vi.fn(),
}))

vi.mock('../api/letterExtrasApi', () => ({ getLetterDetail }))
vi.mock('./LetterExtrasPanel', () => ({ LetterExtrasPanel: () => null }))
vi.mock('@/features/cetak-surat/utils/generateSuratPDF', () => ({
  downloadSuratPDF,
  previewSuratPDF,
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
}

describe('DetailSuratModal masa berlaku', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getLetterDetail.mockImplementation(() => new Promise(() => {}))
  })

  it('keeps download and preview buttons visible but disabled for an expired letter', () => {
    renderModal({ ...approvedLetter, expires_at: '2026-01-10T00:00:00Z', is_expired: true })

    expect(screen.getByText('Kedaluwarsa')).toBeInTheDocument()
    expect(screen.getByText(/hanya tersimpan sebagai riwayat/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Download Surat/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Lihat Dokumen/ })).toBeDisabled()
  })

  it('enables download and shows the validity date for a letter still valid', () => {
    renderModal({ ...approvedLetter, expires_at: '2099-01-10T00:00:00Z', is_expired: false })

    expect(screen.getByText(/Berlaku sampai/)).toBeInTheDocument()
    expect(screen.queryByText('Kedaluwarsa')).toBeNull()
    expect(screen.getByRole('button', { name: /Download Surat/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Lihat Dokumen/ })).toBeEnabled()
  })
})
