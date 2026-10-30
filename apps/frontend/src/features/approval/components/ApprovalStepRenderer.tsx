import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { submitDecision } from '../api'
import type { DecisionResponse } from '../api'
import { alertDialog, confirmDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'
import type { Id, LetterApproval, LetterCurrentStep, UserRole } from '@/types'
import { canDecideOnLetter } from '../utils/canDecide'
import { getApiErrorMessage, apiErrorStatus } from '@/shared/lib/apiError'

type ApprovalStepRendererProps = {
  currentStep: Pick<LetterCurrentStep, 'approver_position' | 'is_final'> | null | undefined
  approvals?: Pick<LetterApproval, 'approval_level' | 'action'>[]
  letterStatus: string
  currentUserRole: UserRole | null | undefined
  apiRole: UserRole | null | undefined
  letterId: Id
  onApprove?: (response: DecisionResponse) => unknown
  onReject?: (notes: string, response: DecisionResponse) => unknown
  // Keputusan ditolak 409 (surat sudah berubah), mis. muat ulang detail.
  onConflict?: () => unknown
  onClose?: () => void
  closeOnDecision?: boolean
}

/**
 * Render aksi untuk pengguna yang berhak pada step aktif dan belum memiliki keputusan.
 */
export default function ApprovalStepRenderer({
  currentStep,
  approvals = [],
  letterStatus,
  currentUserRole,
  apiRole,
  letterId,
  onApprove,
  onReject,
  onConflict,
  onClose,
  closeOnDecision = true,
}: ApprovalStepRendererProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showRejectBox, setShowRejectBox] = useState(false)
  const [alasan, setAlasan] = useState('')

  const canDecide = canDecideOnLetter({
    currentStep,
    approvals,
    letterStatus,
    currentUserRole,
    apiRole,
  })

  if (!canDecide) {
    return null
  }

  const handleApprove = async () => {
    if (isProcessing || !apiRole) return

    // Tahap final menerbitkan surat resmi, jadi minta konfirmasi dulu.
    const confirmed = await confirmDialog(
      currentStep?.is_final
        ? {
            title: 'Setujui dan terbitkan surat?',
            message:
              'Surat akan diterbitkan dengan tanda tangan dan stempel desa, dan tidak dapat dibatalkan.',
            confirmLabel: 'Setujui & terbitkan',
            tone: 'primary',
          }
        : {
            title: 'Setujui permohonan surat ini?',
            message: 'Permohonan akan diteruskan ke tahap berikutnya.',
            confirmLabel: 'Setujui',
            tone: 'primary',
          },
    )

    if (!confirmed) return

    try {
      setIsProcessing(true)

      const response = await submitDecision(apiRole, letterId, 'approved')

      if (onApprove) {
        await onApprove(response)
      }

      notifySuccess(
        currentStep?.is_final
          ? 'Surat disetujui dan diterbitkan.'
          : 'Permohonan disetujui dan diteruskan ke tahap berikutnya.',
      )
      if (closeOnDecision && onClose) onClose()
    } catch (error) {
      console.error('APPROVE ERROR:', error)
      if (apiErrorStatus(error) === 409 && onConflict) {
        await onConflict()
      }
      alertDialog({
        title: 'Gagal menyetujui',
        message: getApiErrorMessage(error, 'Gagal menyetujui surat.'),
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmitReject = async () => {
    const notes = alasan.trim()
    if (!notes || isProcessing || !apiRole) return

    try {
      setIsProcessing(true)

      const response = await submitDecision(apiRole, letterId, 'rejected', notes)

      if (onReject) {
        await onReject(notes, response)
      }

      setAlasan('')
      setShowRejectBox(false)
      notifySuccess('Penolakan surat berhasil dikirim ke pemohon.')
      if (closeOnDecision && onClose) onClose()
    } catch (error) {
      console.error('REJECT ERROR:', error)
      if (apiErrorStatus(error) === 409 && onConflict) {
        await onConflict()
      }
      alertDialog({
        title: 'Gagal menolak',
        message: getApiErrorMessage(error, 'Gagal menolak surat.'),
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const rejectId = `alasan-penolakan-${letterId}`

  const handleCancelReject = async () => {
    // Alasan yang sudah diketik jangan hilang tanpa konfirmasi.
    if (
      alasan.trim() &&
      !(await confirmDialog({
        title: 'Buang perubahan?',
        message: 'Alasan penolakan yang sudah ditulis akan hilang.',
        confirmLabel: 'Buang perubahan',
        cancelLabel: 'Lanjut mengisi',
      }))
    ) {
      return
    }
    setAlasan('')
    setShowRejectBox(false)
  }

  if (showRejectBox) {
    return (
      <div className="sid-decision-reject-box">
        <label htmlFor={rejectId}>Alasan penolakan</label>
        <textarea
          id={rejectId}
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          onKeyDown={(e) => {
            // Escape membatalkan penolakan (dengan konfirmasi), bukan
            // menutup popup dan membuang alasan yang sudah diketik.
            if (e.key === 'Escape') {
              e.preventDefault()
              handleCancelReject()
            }
          }}
          placeholder="Tulis alasan agar pemohon tahu apa yang perlu diperbaiki (wajib)"
          autoFocus
        />
        <div className="sid-decision-actions">
          <button
            type="button"
            onClick={handleCancelReject}
            disabled={isProcessing}
            className="sid-decision-cancel"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmitReject}
            disabled={!alasan.trim() || isProcessing}
            className="sid-decision-reject solid"
          >
            {isProcessing ? 'Memproses...' : 'Kirim penolakan'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="sid-decision-actions">
      <button
        type="button"
        onClick={() => setShowRejectBox(true)}
        disabled={isProcessing}
        className="sid-decision-reject"
      >
        <X size={16} aria-hidden="true" />
        Tolak
      </button>

      <button
        type="button"
        onClick={handleApprove}
        disabled={isProcessing}
        className="sid-decision-approve"
      >
        <Check size={16} aria-hidden="true" />
        {isProcessing ? 'Memproses...' : currentStep?.is_final ? 'Setujui & terbitkan' : 'Setuju'}
      </button>
    </div>
  )
}
