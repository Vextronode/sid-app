import { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { submitDecision } from '../api'

const APPROVER_ROLES_BY_POSITION = {
  rt: ['rt'],
  kepala_desa: ['kepala_desa', 'sekretaris_desa'],
}

const APPROVAL_LEVELS_BY_POSITION = {
  rt: ['rt'],
  kepala_desa: ['kepala_desa', 'sekdes', 'sekretaris_desa'],
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
}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showRejectBox, setShowRejectBox] = useState(false)
  const [alasan, setAlasan] = useState('')

  const position = currentStep?.approver_position
  const approverRoles = APPROVER_ROLES_BY_POSITION[position] ?? []
  const approvalLevels = APPROVAL_LEVELS_BY_POSITION[position] ?? []
  const hasExistingDecision = approvals.some(
    (approval) =>
      approvalLevels.includes(approval?.approval_level) &&
      ['approved', 'rejected'].includes(approval?.action),
  )
  const isDecidable =
    position === 'rt'
      ? letterStatus === 'pending' || letterStatus === 'in_progress'
      : position === 'kepala_desa' && letterStatus === 'in_progress'
  const canDecide =
    isDecidable &&
    approverRoles.includes(currentUserRole) &&
    !hasExistingDecision &&
    Boolean(apiRole)

  if (!canDecide) {
    return null
  }

  const handleApprove = async () => {
    if (isProcessing) return

    try {
      setIsProcessing(true)

      const response = await submitDecision(apiRole, letterId, 'approved')

      if (onApprove) {
        await onApprove(response)
      }

      if (closeOnDecision && onClose) onClose()
    } catch (error) {
      console.error('APPROVE ERROR:', error.response?.data ?? error)
      if (error.response?.status === 409 && onConflict) {
        await onConflict()
      }
      alert(error.response?.data?.message ?? 'Gagal menyetujui surat.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmitReject = async () => {
    const notes = alasan.trim()
    if (!notes || isProcessing) return

    try {
      setIsProcessing(true)

      const response = await submitDecision(apiRole, letterId, 'rejected', notes)

      if (onReject) {
        await onReject(notes, response)
      }

      setAlasan('')
      setShowRejectBox(false)
      if (closeOnDecision && onClose) onClose()
    } catch (error) {
      console.error('REJECT ERROR:', error.response?.data ?? error)
      if (error.response?.status === 409 && onConflict) {
        await onConflict()
      }
      alert(error.response?.data?.message ?? 'Gagal menolak surat.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div>
      {currentStep?.is_final && (
        <span className="inline-block mb-2 px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded">
          Tahap Final
        </span>
      )}

      {!showRejectBox ? (
        <div className="sid-approval-action-bar">
          <button
            type="button"
            onClick={handleApprove}
            disabled={isProcessing}
            className="sid-approval-action-bar__approve"
          >
            <ChevronDown size={16} />
            {isProcessing ? 'Memproses...' : 'Setuju'}
          </button>

          <button
            type="button"
            onClick={() => setShowRejectBox(true)}
            disabled={isProcessing}
            className="sid-approval-action-bar__reject"
          >
            <X size={16} />
            Tolak
          </button>
        </div>
      ) : (
        <div className="sid-approval-reject-box">
          <textarea
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            placeholder="Catatan penolakan (wajib diisi)"
            className="w-full border rounded p-2 text-sm"
          />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={handleSubmitReject}
              disabled={!alasan.trim() || isProcessing}
              className="sid-approval-action-bar__reject"
            >
              {isProcessing ? 'Memproses...' : 'Kirim Penolakan'}
            </button>
            <button
              type="button"
              onClick={() => setShowRejectBox(false)}
              disabled={isProcessing}
              className="sid-approval-action-bar__back"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
