import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSuratDetail, downloadSuratPDF } = vi.hoisted(() => ({
  getSuratDetail: vi.fn(),
  downloadSuratPDF: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ getSuratDetail }))
vi.mock('@/features/surat/components/LetterExtrasPanel', () => ({
  LetterExtrasPanel: (): null => null,
}))
vi.mock('@/features/cetak-surat/utils/generateSuratPDF', () => ({
  downloadSuratPDF,
}))
vi.mock('@/features/cetak-surat/components/PdfCanvasPreview', () => ({
  PdfCanvasPreview: ({ surat }: { surat: { id: string } }) => (
    <div data-testid="pdf-canvas-preview">{surat.id}</div>
  ),
}))

import { partialFixture } from '@/test/fixtures'
import type { LetterListItem } from '@/types'

import OperatorSuratPreviewModal from './OperatorSuratPreviewModal'

describe('OperatorSuratPreviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    downloadSuratPDF.mockResolvedValue(undefined)
  })

  it('keeps Kasi and Kaur letter detail read-only and offers download only after final approval', async () => {
    getSuratDetail.mockResolvedValueOnce({
      data: { data: { id: 'letter-41', status: 'approved', approvals: [] } },
    })
    const { rerender } = render(
      <OperatorSuratPreviewModal
        surat={partialFixture<LetterListItem>({ id: 'letter-41' })}
        onClose={vi.fn()}
      />,
    )

    const downloadButton = await screen.findByRole('button', { name: /Unduh surat/ })
    // Pratinjau dirender sebagai canvas, bukan viewer PDF browser (iframe).
    expect(screen.getByTestId('pdf-canvas-preview')).toHaveTextContent('letter-41')
    expect(document.querySelector('iframe')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Setuju' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Tolak' })).toBeNull()

    // Satu dokumen: tombol langsung mengunduh (tanpa pilihan format TTD).
    fireEvent.click(downloadButton)
    await waitFor(() =>
      expect(downloadSuratPDF).toHaveBeenCalledWith(
        { id: 'letter-41', status: 'approved', approvals: [] },
        'main',
      ),
    )

    getSuratDetail.mockResolvedValueOnce({
      data: { data: { id: 'letter-42', status: 'in_progress', approvals: [] } },
    })
    rerender(
      <OperatorSuratPreviewModal
        surat={partialFixture<LetterListItem>({ id: 'letter-42' })}
        onClose={vi.fn()}
      />,
    )

    await waitFor(() => expect(getSuratDetail).toHaveBeenLastCalledWith('letter-42'))
    expect(screen.queryByRole('button', { name: /Unduh surat/ })).toBeNull()
    expect(screen.queryByTestId('pdf-canvas-preview')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Setuju' })).toBeNull()
  })
})
