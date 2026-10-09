// ==========================================
// DetailSuratModal.jsx
// Popup detail surat untuk Warga.
//
// Warga hanya dapat melihat:
// - detail surat
// - status generic
// - progress
// - alasan penolakan
// - preview dokumen jika sudah approved
//
// akan ditangani pada task
// terpisah.
// ==========================================

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Download, Eye, FileText, X, Check, Clock } from 'lucide-react'

import { downloadSuratPDF, previewSuratPDF } from '@/features/cetak-surat/utils/generateSuratPDF'
import { StatusBadge } from '@/components/ui/StatusBadge'

import { SURAT_STATUS } from '@/constants/suratStatus'
import {
  getApplicantAddress,
  getApplicantNik,
  getLetterTrackingState,
  LETTER_TRACKING_STEPS,
} from '../utils/letterDetails'

import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

// ==========================================
// FIELD MAP
// ==========================================

const FIELD_MAP = {
  noSurat: (s) => s?.letter_number ?? '-',

  namaPemohon: (s) => s?.applicant_name ?? '-',

  nik: getApplicantNik,

  alamat: getApplicantAddress,

  jenisSurat: (s) => s?.letter_type?.name ?? '-',

  keperluan: (s) => s?.purpose ?? '-',

  diajukan: (s) => (s?.submitted_at ? new Date(s.submitted_at).toLocaleString('id-ID') : '-'),

  terakhirDiproses: (s) => (s?.updated_at ? new Date(s.updated_at).toLocaleString('id-ID') : '-'),
}

// ==========================================
// GENERIC TRACKING STEPS
// ==========================================

// ==========================================
// GENERIC TRACKER
// ==========================================

function GenericTracker({ surat }) {
  const { currentStep, rejectedStep, completed } = getLetterTrackingState(surat)

  return (
    <div className="sid-tracker-scroll">
      <div className="sid-tracker-stepper">
        {LETTER_TRACKING_STEPS.map((label, index) => {
          const stepNumber = index + 1

          const isRejected = rejectedStep === stepNumber

          const isDone = completed || (!isRejected && stepNumber < currentStep)

          const isCurrent = !completed && !isRejected && stepNumber === currentStep

          let circleClass = 'sid-tracker-circle sid-tracker-circle-waiting'

          let labelClass = 'sid-tracker-label'

          let content = stepNumber

          if (isRejected) {
            circleClass = 'sid-tracker-circle sid-tracker-circle-rejected'

            labelClass = 'sid-tracker-label sid-tracker-label-rejected'

            content = <X size={15} strokeWidth={2.5} />
          } else if (isDone) {
            circleClass = 'sid-tracker-circle sid-tracker-circle-done'

            labelClass = 'sid-tracker-label sid-tracker-label-done'

            content = <Check size={15} strokeWidth={2.5} />
          } else if (isCurrent) {
            circleClass = 'sid-tracker-circle sid-tracker-circle-current'

            labelClass = 'sid-tracker-label sid-tracker-label-current'

            content = <Clock size={15} />
          }

          const connectorDone = completed || stepNumber < currentStep

          return (
            <div key={label} className="sid-tracker-step">
              <div className="sid-tracker-node">
                <div className={circleClass}>{content}</div>

                {stepNumber < LETTER_TRACKING_STEPS.length && (
                  <div
                    className={`sid-tracker-line${connectorDone ? ' sid-tracker-line-done' : ''}`}
                  />
                )}
              </div>

              <div className="sid-tracker-label-wrapper">
                <span className={labelClass}>{label}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ==========================================
// REJECTION INFORMATION
// ==========================================

function RejectionReason({ surat }) {
  if (surat?.status !== SURAT_STATUS.REJECTED) {
    return null
  }

  const reason =
    surat?.notes ?? surat?.reason ?? surat?.rejection_reason ?? 'Tidak ada catatan penolakan.'

  return (
    <div className="sid-decision-box rejected">
      <div className="sid-decision-header">
        <p className="sid-decision-title">Alasan Penolakan</p>

        <span className="sid-decision-badge rejected">DITOLAK</span>
      </div>

      <div className="sid-decision-comment rejected">{reason}</div>
    </div>
  )
}

// ==========================================
// PREVIEW PDF
// ==========================================

function SuratPreview({ surat }) {
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  const canvasContainerRef = useRef(null)

  const pdfDocumentRef = useRef(null)

  // ========================================
  // STATUS PREVIEW
  // ========================================

  const status = surat?.status

  const canPreview = status === SURAT_STATUS.APPROVED

  const handleDownload = async () => {
    setDownloading(true)
    setDownloadError('')
    try {
      await downloadSuratPDF(surat)
    } catch (error) {
      setDownloadError(error?.message || 'Gagal mengunduh surat.')
    } finally {
      setDownloading(false)
    }
  }

  // ========================================
  // RESET
  // ========================================

  useEffect(() => {
    if (pdfDocumentRef.current) {
      pdfDocumentRef.current.destroy()
      pdfDocumentRef.current = null
    }

    const resetTimer = setTimeout(() => {
      setShowPreview(false)
      setLoading(false)
      setLoadError(false)
    }, 0)

    return () => {
      clearTimeout(resetTimer)
    }
  }, [surat?.id])

  // ========================================
  // LOAD PDF
  // ========================================

  useEffect(() => {
    if (!showPreview || !canPreview || !surat?.id) {
      return
    }

    let cancelled = false
    let blobUrl = null

    const loadPDF = async () => {
      try {
        setLoading(true)
        setLoadError(false)

        blobUrl = await previewSuratPDF(surat)

        if (cancelled) {
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl)
          }

          return
        }

        const loadingTask = pdfjsLib.getDocument({
          url: blobUrl,
        })

        const pdf = await loadingTask.promise

        if (cancelled) {
          await pdf.destroy()
          URL.revokeObjectURL(blobUrl)

          return
        }

        pdfDocumentRef.current = pdf

        const container = canvasContainerRef.current

        if (!container) {
          return
        }

        container.innerHTML = ''

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          if (cancelled) {
            break
          }

          const page = await pdf.getPage(pageNumber)

          const baseViewport = page.getViewport({
            scale: 1,
          })

          const containerWidth = container.clientWidth || 600

          const computedStyle = window.getComputedStyle(container)

          const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0

          const paddingRight = parseFloat(computedStyle.paddingRight) || 0

          const availableWidth = containerWidth - paddingLeft - paddingRight

          const scale = availableWidth / baseViewport.width

          const viewport = page.getViewport({
            scale: Math.max(scale, 0.5),
          })

          const pageWrapper = document.createElement('div')

          pageWrapper.className = 'sid-pdf-page'

          const canvas = document.createElement('canvas')

          const context = canvas.getContext('2d')

          const pixelRatio = window.devicePixelRatio || 1

          canvas.width = Math.floor(viewport.width * pixelRatio)

          canvas.height = Math.floor(viewport.height * pixelRatio)

          canvas.style.width = `${viewport.width}px`

          canvas.style.height = `${viewport.height}px`

          canvas.className = 'sid-pdf-canvas'

          context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

          pageWrapper.appendChild(canvas)

          container.appendChild(pageWrapper)

          await page.render({
            canvasContext: context,
            viewport,
          }).promise
        }
      } catch (error) {
        console.error('Gagal memuat preview PDF:', error)

        if (!cancelled) {
          setLoadError(true)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadPDF()

    return () => {
      cancelled = true

      if (pdfDocumentRef.current) {
        pdfDocumentRef.current.destroy()
        pdfDocumentRef.current = null
      }

      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [showPreview, canPreview, surat])

  return (
    <>
      {canPreview && (
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="sid-modal-preview"
        >
          <Download size={16} />
          {downloading ? 'Menyiapkan unduhan...' : 'Download Surat'}
        </button>
      )}

      {downloadError && (
        <p className="sid-admin-alert sid-admin-alert-error" role="alert">
          {downloadError}
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          if (!canPreview) {
            return
          }

          setShowPreview((prev) => !prev)
        }}
        disabled={!canPreview}
        className={`sid-modal-preview ${!canPreview ? 'sid-preview-disabled' : ''}`}
      >
        <Eye size={16} />

        {canPreview
          ? showPreview
            ? 'Sembunyikan Preview'
            : 'Lihat Dokumen (Preview)'
          : 'Preview tersedia setelah surat disetujui'}
      </button>

      {showPreview && (
        <div className="sid-preview-container">
          {loading && (
            <div className="sid-preview-loading">
              <div className="sid-loading-spinner" />

              <p>Memuat preview...</p>
            </div>
          )}

          {!loading && loadError && (
            <div className="sid-preview-error">
              <FileText size={32} />

              <p>Gagal memuat preview surat.</p>

              <button
                type="button"
                onClick={() => {
                  setShowPreview(false)

                  setTimeout(() => {
                    setShowPreview(true)
                  }, 100)
                }}
                className="sid-btn sid-btn-primary"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {!loading && !loadError && <div ref={canvasContainerRef} className="sid-pdf-container" />}
        </div>
      )}
    </>
  )
}

// ==========================================
// DETAIL INFORMATION
// ==========================================

function DetailInfo({ surat }) {
  const infoFields = [
    {
      label: 'Nama Pemohon',
      value: FIELD_MAP.namaPemohon(surat),
    },
    {
      label: 'NIK',
      value: FIELD_MAP.nik(surat),
    },
    {
      label: 'Alamat',
      value: FIELD_MAP.alamat(surat),
    },
    {
      label: 'Jenis Surat',
      value: FIELD_MAP.jenisSurat(surat),
    },
    {
      label: 'Keperluan',
      value: FIELD_MAP.keperluan(surat),
    },
    {
      label: 'Diajukan',
      value: FIELD_MAP.diajukan(surat),
    },
    {
      label: 'Terakhir diproses',
      value: FIELD_MAP.terakhirDiproses(surat),
    },
  ]

  return (
    <div className="sid-modal-info">
      {infoFields.map((field) => (
        <div key={field.label}>
          <p className="sid-modal-info-label">{field.label}</p>

          <p className="sid-modal-info-value">{field.value}</p>
        </div>
      ))}
    </div>
  )
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function DetailSuratModal({ data, onClose }) {
  if (!data) {
    return null
  }

  return (
    <div className="sid-modal-overlay">
      <div className="sid-modal">
        {/* CLOSE */}

        <button type="button" onClick={onClose} className="sid-modal-close" aria-label="Tutup">
          <X size={18} />
        </button>

        {/* HEADER */}

        <h2 className="sid-modal-title">Detail Permohonan Surat</h2>

        <p className="sid-modal-subtitle">
          #{FIELD_MAP.noSurat(data)}
          {' · Surat saya'}
        </p>

        {/* STATUS */}

        <div className="mb-4">
          <StatusBadge status={data.status} />
        </div>

        {/* GENERIC TRACKER */}

        <GenericTracker surat={data} />

        {/* DETAIL SURAT */}

        <DetailInfo surat={data} />

        {/* ALASAN PENOLAKAN */}

        <RejectionReason surat={data} />

        {/* PREVIEW */}

        <SuratPreview surat={data} />

        {/* KEMBALI */}

        <button type="button" onClick={onClose} className="sid-modal-action back">
          <ChevronLeft size={16} />
          Kembali
        </button>
      </div>
    </div>
  )
}
