import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { previewSuratPDF, loadPdfjs, loadingTaskDestroy, renderCancel } = vi.hoisted(() => ({
  previewSuratPDF: vi.fn(),
  loadPdfjs: vi.fn(),
  loadingTaskDestroy: vi.fn(),
  renderCancel: vi.fn(),
}))

vi.mock('@/features/cetak-surat/utils/generateSuratPDF', () => ({ previewSuratPDF }))
vi.mock('@/lib/pdfjs', () => ({ loadPdfjs }))

import { PdfCanvasPreview } from './PdfCanvasPreview'

// Bentuk API pdf.js 6: destroy() hanya ada di loading task, dokumen
// (PDFDocumentProxy) tidak punya destroy().
function fakePdfjs({ renderPromise = Promise.resolve() } = {}) {
  const page = {
    getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 848 * scale }),
    render: () => ({ promise: renderPromise, cancel: renderCancel }),
  }
  const pdfDocument = { numPages: 1, getPage: vi.fn().mockResolvedValue(page) }

  return {
    getDocument: () => ({
      promise: Promise.resolve(pdfDocument),
      destroy: loadingTaskDestroy.mockResolvedValue(undefined),
    }),
  }
}

describe('PdfCanvasPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    previewSuratPDF.mockResolvedValue('blob:preview')
    globalThis.URL.revokeObjectURL = vi.fn()
    // Cukup setTransform yang dipakai PdfCanvasPreview.
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      setTransform: vi.fn(),
    })) as unknown as HTMLCanvasElement['getContext']
  })

  it('renders pages into canvases and blocks the context menu', async () => {
    loadPdfjs.mockResolvedValue(fakePdfjs())
    render(<PdfCanvasPreview surat={{ id: 'letter-1' }} />)

    const container = screen.getByTestId('pdf-canvas-preview')
    await waitFor(() => expect(container.querySelector('canvas')).not.toBeNull())
    expect(container).not.toHaveAttribute('hidden')
    expect(previewSuratPDF).toHaveBeenCalledWith({ id: 'letter-1' }, 'digital', 'main')

    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    container.querySelector('canvas').dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('unmounts cleanly after rendering (pdf.js 6 document has no destroy)', async () => {
    loadPdfjs.mockResolvedValue(fakePdfjs())
    const { unmount } = render(<PdfCanvasPreview surat={{ id: 'letter-1' }} />)

    await waitFor(() =>
      expect(screen.getByTestId('pdf-canvas-preview').querySelector('canvas')).not.toBeNull(),
    )

    expect(() => unmount()).not.toThrow()
    expect(loadingTaskDestroy).toHaveBeenCalled()
  })

  it('cancels an in-flight render when unmounted', async () => {
    loadPdfjs.mockResolvedValue(fakePdfjs({ renderPromise: new Promise(() => {}) }))
    const { unmount } = render(<PdfCanvasPreview surat={{ id: 'letter-1' }} />)

    await waitFor(() =>
      expect(screen.getByTestId('pdf-canvas-preview').querySelector('canvas')).not.toBeNull(),
    )

    expect(() => unmount()).not.toThrow()
    expect(renderCancel).toHaveBeenCalled()
    expect(loadingTaskDestroy).toHaveBeenCalled()
  })

  it('shows a retry card when loading fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    loadPdfjs.mockResolvedValue(fakePdfjs())
    previewSuratPDF.mockRejectedValueOnce(new Error('403'))
    render(<PdfCanvasPreview surat={{ id: 'letter-1' }} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Coba Lagi' }))

    await waitFor(() =>
      expect(screen.getByTestId('pdf-canvas-preview').querySelector('canvas')).not.toBeNull(),
    )
    expect(previewSuratPDF).toHaveBeenCalledTimes(2)
  })
})
