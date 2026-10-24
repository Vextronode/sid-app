import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSuratDetail, downloadSuratPDF } = vi.hoisted(() => ({
  getSuratDetail: vi.fn(),
  downloadSuratPDF: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ getSuratDetail }))
vi.mock('@/features/surat/components/LetterExtrasPanel', () => ({
  LetterExtrasPanel: () => null,
}))
vi.mock('@/features/cetak-surat/utils/generateSuratPDF', () => ({
  downloadSuratPDF,
}))
vi.mock('@/features/cetak-surat/components/PdfCanvasPreview', () => ({
  PdfCanvasPreview: ({ surat }) => <div data-testid="pdf-canvas-preview">{surat.id}</div>,
}))

import OperatorSuratPreviewModal from './OperatorSuratPreviewModal'

describe('OperatorSuratPreviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    downloadSuratPDF.mockResolvedValue(undefined)
  })

  it('keeps Kasi and Kaur letter detail read-only and offers download only after final approval', async () => {
    getSuratDetail.mockResolvedValueOnce({
      data: { data: { id: 'letter-1', status: 'approved', approvals: [] } },
    })
    const { rerender } = render(
      <OperatorSuratPreviewModal surat={{ id: 'letter-1' }} onClose={vi.fn()} />,
    )

    const downloadButton = await screen.findByRole('button', { name: /Unduh surat/ })
    // Pratinjau dirender sebagai canvas, bukan viewer PDF browser (iframe).
    expect(screen.getByTestId('pdf-canvas-preview')).toHaveTextContent('letter-1')
    expect(document.querySelector('iframe')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Setuju' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Tolak' })).toBeNull()

    fireEvent.click(downloadButton)
    fireEvent.click(screen.getByRole('menuitem', { name: /Untuk tanda tangan basah/ }))
    await waitFor(() =>
      expect(downloadSuratPDF).toHaveBeenCalledWith(
        { id: 'letter-1', status: 'approved', approvals: [] },
        'wet',
        'main',
      ),
    )

    getSuratDetail.mockResolvedValueOnce({
      data: { data: { id: 'letter-2', status: 'in_progress', approvals: [] } },
    })
    rerender(<OperatorSuratPreviewModal surat={{ id: 'letter-2' }} onClose={vi.fn()} />)

    await waitFor(() => expect(getSuratDetail).toHaveBeenLastCalledWith('letter-2'))
    expect(screen.queryByRole('button', { name: /Unduh surat/ })).toBeNull()
    expect(screen.queryByTestId('pdf-canvas-preview')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Setuju' })).toBeNull()
  })
})
