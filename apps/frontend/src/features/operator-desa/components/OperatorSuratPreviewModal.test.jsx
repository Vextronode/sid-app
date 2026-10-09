import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSuratDetail, previewSuratPDF, generateSuratPDF } = vi.hoisted(() => ({
  getSuratDetail: vi.fn(),
  previewSuratPDF: vi.fn(),
  generateSuratPDF: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ getSuratDetail }))
vi.mock('@/features/cetak-surat/utils/generateSuratPDF', () => ({
  previewSuratPDF,
  generateSuratPDF,
}))

import OperatorSuratPreviewModal from './OperatorSuratPreviewModal'

describe('OperatorSuratPreviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    previewSuratPDF.mockResolvedValue('blob:preview')
    generateSuratPDF.mockResolvedValue(undefined)
  })

  it('keeps Kasi and Kaur letter detail read-only and offers download only after final approval', async () => {
    getSuratDetail.mockResolvedValueOnce({
      data: { data: { id: 'letter-1', status: 'approved', approvals: [] } },
    })
    const { rerender } = render(
      <OperatorSuratPreviewModal surat={{ id: 'letter-1' }} onClose={vi.fn()} />,
    )

    const downloadButton = await screen.findByRole('button', { name: 'Unduh Surat' })
    expect(screen.queryByRole('button', { name: 'Setuju' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Tolak' })).toBeNull()

    fireEvent.click(downloadButton)
    await waitFor(() => expect(generateSuratPDF).toHaveBeenCalledWith({
      id: 'letter-1',
      status: 'approved',
      approvals: [],
    }))

    getSuratDetail.mockResolvedValueOnce({
      data: { data: { id: 'letter-2', status: 'in_progress', approvals: [] } },
    })
    rerender(<OperatorSuratPreviewModal surat={{ id: 'letter-2' }} onClose={vi.fn()} />)

    await waitFor(() => expect(getSuratDetail).toHaveBeenLastCalledWith('letter-2'))
    expect(screen.queryByRole('button', { name: 'Unduh Surat' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Setuju' })).toBeNull()
  })
})
