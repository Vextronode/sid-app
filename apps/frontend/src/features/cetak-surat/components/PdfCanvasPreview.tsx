// ==========================================
// PdfCanvasPreview.tsx
// Pratinjau surat yang dirender sebagai canvas (pdf.js) di dalam halaman.
//
// Sengaja tidak memakai viewer PDF bawaan browser (tab baru / iframe):
// viewer itu selalu punya tombol unduh & cetak yang tidak bisa dimatikan
// secara andal. Unduhan resmi hanya lewat tombol "Unduh/Download Surat".
// ==========================================

import { useEffect, useRef, useState } from 'react'
import { FileText } from 'lucide-react'

import { previewSuratPDF } from '@/features/cetak-surat/utils/generateSuratPDF'
import type { PdfTemplate, PrintableLetter } from '@/features/cetak-surat/utils/letterDocuments'
import type { PDFDocumentLoadingTask, RenderTask } from 'pdfjs-dist/types/src/display/api'
import { loadPdfjs } from '@/lib/pdfjs'

type PdfCanvasPreviewProps = {
  surat: Pick<PrintableLetter, 'id'> | null | undefined
  template?: PdfTemplate
  documentKey?: string
}

export function PdfCanvasPreview({
  surat,
  template = 'digital',
  documentKey = 'main',
}: PdfCanvasPreviewProps) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)

  const suratId = surat?.id

  useEffect(() => {
    if (!suratId) {
      return
    }

    let cancelled = false
    let loadingTask: PDFDocumentLoadingTask | null = null
    let renderTask: RenderTask | null = null

    const loadPDF = async () => {
      setLoading(true)
      setLoadError(false)

      try {
        const [blobUrl, pdfjsLib] = await Promise.all([
          previewSuratPDF({ id: suratId }, template, documentKey),
          loadPdfjs(),
        ])

        if (cancelled) {
          URL.revokeObjectURL(blobUrl)
          return
        }

        let pdfDocument

        try {
          loadingTask = pdfjsLib.getDocument({ url: blobUrl })
          pdfDocument = await loadingTask.promise
        } finally {
          URL.revokeObjectURL(blobUrl)
        }

        const container = containerRef.current

        if (cancelled || !container) {
          return
        }

        container.replaceChildren()

        // Kontainer masih tersembunyi selama loading, jadi lebar diukur
        // dari pembungkusnya.
        const computedStyle = window.getComputedStyle(container)
        const availableWidth =
          (container.parentElement?.clientWidth || 600) -
          (parseFloat(computedStyle.paddingLeft) || 0) -
          (parseFloat(computedStyle.paddingRight) || 0)

        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
          if (cancelled) {
            return
          }

          const page = await pdfDocument.getPage(pageNumber)
          const baseViewport = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({
            scale: Math.max(availableWidth / baseViewport.width, 0.5),
          })

          const pageWrapper = document.createElement('div')
          pageWrapper.className = 'sid-pdf-page'

          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          if (!context) return

          const pixelRatio = window.devicePixelRatio || 1

          canvas.width = Math.floor(viewport.width * pixelRatio)
          canvas.height = Math.floor(viewport.height * pixelRatio)
          canvas.style.width = `${viewport.width}px`
          canvas.style.height = `${viewport.height}px`
          canvas.className = 'sid-pdf-canvas'
          context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

          pageWrapper.appendChild(canvas)
          container.appendChild(pageWrapper)

          // pdf.js 6 mewajibkan `canvas`; sama dengan kanvas milik context.
          renderTask = page.render({ canvas, canvasContext: context, viewport })
          await renderTask.promise
          renderTask = null
        }
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error('Gagal memuat pratinjau PDF:', error)
        setLoadError(true)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadPDF()

    // Cleanup tidak boleh melempar error: error di sini membuat React
    // melepas seluruh halaman (layar putih). Di pdf.js 6, destroy() ada
    // di loading task, bukan di dokumen.
    return () => {
      cancelled = true

      try {
        renderTask?.cancel()
      } catch {
        // render sudah selesai/batal
      }

      loadingTask?.destroy().catch(() => {})
    }
  }, [suratId, template, documentKey, attempt])

  return (
    <div className="sid-preview-container" onContextMenu={(event) => event.preventDefault()}>
      {loading && (
        <div className="sid-preview-loading">
          <div className="sid-loading-spinner" />

          <p>Memuat pratinjau...</p>
        </div>
      )}

      {!loading && loadError && (
        <div className="sid-preview-error" role="alert">
          <FileText size={32} />

          <p>Gagal memuat pratinjau surat.</p>

          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="sid-btn sid-btn-primary"
          >
            Coba Lagi
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className="sid-pdf-container"
        data-testid="pdf-canvas-preview"
        hidden={loading || loadError}
      />
    </div>
  )
}
