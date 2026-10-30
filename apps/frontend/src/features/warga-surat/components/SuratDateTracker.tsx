/* eslint-disable react-hooks/set-state-in-effect */

// ==========================================
// SuratDateTracker.tsx
//
// Tracking surat berdasarkan tanggal pengajuan.
//
// Status generic:
// pending
// in_progress
// approved
// rejected
//
// Workflow tampilan:
// Pengajuan -> RT -> Kades -> Selesai
//
// Selesai:
// Surat sudah menyelesaikan proses Operator.
// ==========================================

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'

import { Calendar, Check, ChevronLeft, ChevronRight, Clock, FileText, X } from 'lucide-react'

import { PdfCanvasPreview } from '@/features/cetak-surat/components/PdfCanvasPreview'
import type { PdfTemplate } from '@/features/cetak-surat/utils/letterDocuments'
import { LetterValidityNote } from '@/features/surat/components/LetterValidityNote'
import { StatusBadge } from '@/components/ui/StatusBadge'

import { SURAT_STATUS } from '@/constants/suratStatus'

import { useLetters } from '@/features/surat/hooks/useLetters'
import type { Id, LetterListItem } from '@/types'

// ==========================================
// TRACKING STEPS
// ==========================================

const STEPS = ['Pengajuan', 'RT', 'Kades', 'Selesai']

// ==========================================
// TRACKING STATE
// ==========================================

function getTrackingState(surat: LetterListItem) {
  const status = surat?.status

  const currentStepOrder = Number(surat?.current_step_order)

  const rejectedAtStep = Number(surat?.rejected_at_step) || null

  // ==========================================
  // REJECTED
  // ==========================================

  if (status === SURAT_STATUS.REJECTED) {
    return {
      currentStep: rejectedAtStep || currentStepOrder || 1,
      rejectedStep: rejectedAtStep || currentStepOrder || 1,
      completed: false,
    }
  }

  // ==========================================
  // APPROVED
  // ==========================================

  if (status === SURAT_STATUS.APPROVED) {
    return {
      currentStep: 4,
      rejectedStep: null,
      completed: true,
    }
  }

  // ==========================================
  // PENDING / IN PROGRESS
  // ==========================================

  const step =
    currentStepOrder >= 1 && currentStepOrder <= 3
      ? currentStepOrder
      : status === SURAT_STATUS.PENDING
        ? 1
        : 2

  return {
    currentStep: step,
    rejectedStep: null,
    completed: false,
  }
}

// ==========================================
// TRACKING STEPPER
// ==========================================

function TrackingStepper({ surat }: { surat: LetterListItem }) {
  const { currentStep, rejectedStep, completed } = getTrackingState(surat)

  return (
    <div className="sid-tracker-scroll">
      <div className="sid-tracker-stepper">
        {STEPS.map((label, index) => {
          const stepNumber = index + 1

          // =================================
          // REJECTED
          // =================================

          const isRejected = !completed && rejectedStep === stepNumber

          // =================================
          // DONE
          // =================================

          const isDone = completed || (!isRejected && stepNumber < currentStep)

          // =================================
          // CURRENT
          // =================================

          const isCurrent = !completed && !isRejected && stepNumber === currentStep

          // =================================
          // DEFAULT
          // =================================

          let circleClass = 'sid-tracker-circle sid-tracker-circle-waiting'

          let labelClass = 'sid-tracker-label'

          let circleContent: ReactNode = stepNumber

          // =================================
          // REJECTED
          // =================================

          if (isRejected) {
            circleClass = 'sid-tracker-circle sid-tracker-circle-rejected'

            labelClass = 'sid-tracker-label sid-tracker-label-rejected'

            circleContent = <X size={15} strokeWidth={2.5} />
          }

          // =================================
          // DONE
          // =================================
          else if (isDone) {
            circleClass = 'sid-tracker-circle sid-tracker-circle-done'

            labelClass = 'sid-tracker-label sid-tracker-label-done'

            circleContent = <Check size={15} strokeWidth={2.5} />
          }

          // =================================
          // CURRENT
          // =================================
          else if (isCurrent) {
            circleClass = 'sid-tracker-circle sid-tracker-circle-current'

            labelClass = 'sid-tracker-label sid-tracker-label-current'

            circleContent = <Clock size={15} />
          }

          // =================================
          // CONNECTOR
          // =================================

          const connectorDone = completed || stepNumber < currentStep

          return (
            <div key={label} className="sid-tracker-step">
              <div className="sid-tracker-node">
                <div className={circleClass}>{circleContent}</div>

                {stepNumber < STEPS.length && (
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
// REJECTION REASON
// ==========================================

function RejectionReason({ surat }: { surat: LetterListItem }) {
  if (surat?.status !== SURAT_STATUS.REJECTED) {
    return null
  }

  // Alasan penolakan tersimpan di approval (letter_approvals.notes); daftar
  // surat (LetterListItem) belum membawanya, jadi teks cadangan yang tampil.
  const reason = surat?.notes ?? 'Tidak ada catatan penolakan.'

  return (
    <div className="sid-date-tracker-rejection">
      <div className="sid-date-tracker-rejection-header">
        <p className="sid-date-tracker-rejection-title">Surat Ditolak</p>

        <span className="sid-decision-badge rejected">DITOLAK</span>
      </div>

      <p className="sid-date-tracker-rejection-label">Alasan Penolakan</p>

      <div className="sid-date-tracker-rejection-content">{reason}</div>
    </div>
  )
}

// ==========================================
// STATUS PREVIEW PDF
// ==========================================

const canPreviewStatuses = [SURAT_STATUS.APPROVED]

const canPreviewSurat = (status: string) => canPreviewStatuses.includes(status)

// ==========================================
// TEMPLATE PDF
// ==========================================

function getPreviewTemplate(status: string): PdfTemplate | null {
  if (status === SURAT_STATUS.APPROVED) {
    return 'digital'
  }

  return null
}

// ==========================================
// PREVIEW PDF
// ==========================================

function SuratPreview({
  suratId,
  status,
  isExpired = false,
}: {
  suratId: Id
  status: string
  isExpired?: boolean
}) {
  const [showPreview, setShowPreview] = useState(false)

  // Surat kedaluwarsa tinggal riwayat: tombol tetap tampil tetapi nonaktif.
  const expired = canPreviewSurat(status) && isExpired
  const canPreview = canPreviewSurat(status) && !expired
  const template = getPreviewTemplate(status)

  useEffect(() => {
    setShowPreview(false)
  }, [suratId])

  return (
    <div className="sid-date-tracker-preview">
      <button
        type="button"
        disabled={!canPreview}
        title={expired ? 'Masa berlaku surat telah habis' : undefined}
        onClick={() => {
          if (!canPreview) {
            return
          }

          setShowPreview((prev) => !prev)
        }}
        className={`sid-date-tracker-preview-action${
          !canPreview ? ' sid-date-tracker-preview-action-disabled' : ''
        }`}
      >
        <FileText className="sid-date-tracker-preview-icon" />

        {canPreview
          ? showPreview
            ? 'Sembunyikan Pratinjau Surat'
            : 'Lihat Pratinjau Surat'
          : expired
            ? 'Lihat Pratinjau Surat'
            : 'Pratinjau tersedia setelah disetujui'}
      </button>

      {/* Canvas, bukan <img>: tidak ada gambar yang bisa disimpan lewat klik kanan. */}
      {showPreview && canPreview && template && (
        <PdfCanvasPreview surat={{ id: suratId }} template={template} />
      )}
    </div>
  )
}

// ==========================================
// HELPER FILTER TANGGAL
// ==========================================

// Di atas jumlah ini titik navigasi tidak lagi berguna; penghitung
// "Surat X dari Y" dan tombol panah sudah cukup.
const MAX_DOTS = 10

// Awal dan akhir hari YYYY-MM-DD menurut zona waktu perangkat, sebagai
// waktu ISO, supaya server menyaring tanggal lokal dengan tepat.
function localDayRange(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)

  return {
    submittedFrom: new Date(year, month - 1, day, 0, 0, 0, 0).toISOString(),
    submittedTo: new Date(year, month - 1, day, 23, 59, 59, 999).toISOString(),
  }
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function SuratDateTracker() {
  const [selectedDate, setSelectedDate] = useState('')

  const [slideIndex, setSlideIndex] = useState(0)

  // Satu slide = satu surat = satu halaman di server, sehingga seluruh
  // surat bisa digeser tanpa batas jumlah dan tiap perpindahan hanya
  // mengambil satu baris.
  const { letters, meta, loading } = useLetters({
    page: slideIndex + 1,
    perPage: 1,
    ...(selectedDate ? localDayRange(selectedDate) : {}),
  })

  const totalLetters = meta.total

  const dateInputRef = useRef(null)

  // ==========================================
  // JAGA SLIDE INDEX
  // (jumlah surat bisa berkurang, mis. setelah surat dihapus)
  // ==========================================

  useEffect(() => {
    if (!loading && slideIndex > 0 && slideIndex >= totalLetters) {
      setSlideIndex(Math.max(0, totalLetters - 1))
    }
  }, [loading, totalLetters, slideIndex])

  // ==========================================
  // FILTER TANGGAL
  // ==========================================

  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value)

    setSlideIndex(0)
  }

  const clearDateFilter = () => {
    setSelectedDate('')
    setSlideIndex(0)
  }

  const openCalendar = () => {
    dateInputRef.current?.showPicker?.()
  }

  // ==========================================
  // SURAT AKTIF
  // ==========================================

  const activeSurat = letters[0]

  // ==========================================
  // FORMAT TANGGAL
  // ==========================================

  const formattedSelectedDate = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="sid-date-tracker">
      {/* FILTER TANGGAL */}

      <div className="sid-date-tracker-filter">
        <button type="button" onClick={openCalendar} className="sid-date-tracker-calendar-button">
          <div className="sid-date-tracker-calendar-label">
            <Calendar size={16} strokeWidth={1.8} className="sid-date-tracker-calendar-icon" />

            <span>{formattedSelectedDate ?? 'Pilih tanggal'}</span>
          </div>

          <span className="sid-date-tracker-calendar-action">
            {selectedDate ? 'Ubah' : 'Pilih'}
          </span>
        </button>

        {selectedDate && (
          <button type="button" onClick={clearDateFilter} className="sid-date-tracker-clear-button">
            Semua
          </button>
        )}

        <input
          ref={dateInputRef}
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          className="sid-date-tracker-date-input"
        />
      </div>

      {/* DATA SURAT */}

      {loading ? (
        <p className="sid-date-tracker-empty">Memuat data surat...</p>
      ) : totalLetters === 0 ? (
        <p className="sid-date-tracker-empty">
          {selectedDate ? 'Belum ada surat pada tanggal ini.' : 'Belum ada permohonan surat.'}
        </p>
      ) : (
        <>
          {/* HEADER SURAT */}

          <div className="sid-date-tracker-header">
            <button
              type="button"
              onClick={() => setSlideIndex((index) => Math.max(0, index - 1))}
              disabled={slideIndex === 0}
              aria-label="Surat sebelumnya"
              className="sid-date-tracker-nav-button"
            >
              <ChevronLeft size={17} strokeWidth={1.8} />
            </button>

            <div className="sid-date-tracker-header-info">
              <p className="sid-date-tracker-letter-type">
                {activeSurat?.letter_type?.name ?? '-'}
              </p>

              <p className="sid-date-tracker-letter-number">
                Surat {slideIndex + 1} dari {totalLetters}
                {' · #'}
                {activeSurat?.letter_number ?? `SKD-${activeSurat?.id}`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSlideIndex((index) => Math.min(totalLetters - 1, index + 1))}
              disabled={slideIndex >= totalLetters - 1}
              aria-label="Surat berikutnya"
              className="sid-date-tracker-nav-button"
            >
              <ChevronRight size={17} strokeWidth={1.8} />
            </button>
          </div>

          {/* STATUS */}

          <div className="mb-4">
            <StatusBadge status={activeSurat?.status} />
          </div>

          {/* TRACKING */}

          <TrackingStepper surat={activeSurat} />

          {/* REJECTION */}

          <RejectionReason surat={activeSurat} />

          {/* DOT SLIDER */}

          {totalLetters > 1 && totalLetters <= MAX_DOTS && (
            <div className="sid-date-tracker-dots">
              {Array.from({ length: totalLetters }, (_, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => setSlideIndex(index)}
                  aria-label={`Pilih surat ${index + 1}`}
                  className={`sid-date-tracker-dot${index === slideIndex ? ' active' : ''}`}
                />
              ))}
            </div>
          )}

          {/* PREVIEW PDF */}

          {activeSurat?.status === SURAT_STATUS.APPROVED && (
            <LetterValidityNote surat={activeSurat} />
          )}
          <SuratPreview
            suratId={activeSurat?.id}
            status={activeSurat?.status}
            isExpired={activeSurat?.is_expired === true}
          />
        </>
      )}
    </div>
  )
}
