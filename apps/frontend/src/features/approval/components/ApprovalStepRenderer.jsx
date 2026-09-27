import { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { submitDecision } from '../api'

/**
 * Komponen generik untuk render aksi approval — SATU komponen untuk semua
 * @param {string} approverPosition - flow_steps.approver_position step aktif
 * @param {boolean} isFinal - flow_steps.is_final step aktif
 * @param {string} letterStatus - status surat saat ini (pending|in_progress|approved|rejected)
 * @param {string} currentUserRole - role user yang login (dari useAuth)
 * @param {string} apiRole - role untuk resolve endpoint: 'rt'|'kepala_desa'|'sekretaris_desa'|'kasi_pelayanan'|'kaur_tu_umum'
 * @param {string|number} letterId
 * @param {function} onApprove - callback setelah approve sukses, menerima response
 * @param {function} onReject - callback setelah reject sukses, menerima (notes, response)
 * @param {function} onClose - dipanggil setelah approve sukses (menutup modal, dst)
 */
export default function ApprovalStepRenderer({
  approverPosition,
  isFinal,
  letterStatus,
  currentUserRole,
  apiRole,
  letterId,
  onApprove,
  onReject,
  onClose,
}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showRejectBox, setShowRejectBox] = useState(false)
  const [alasan, setAlasan] = useState('')

  const isDecidable = letterStatus === 'pending' || letterStatus === 'in_progress'
  const canDecide = isDecidable && approverPosition === currentUserRole

  if (!canDecide) {
    return <ReadOnlyStepView approverPosition={approverPosition} isFinal={isFinal} />
  }

  const handleApprove = async () => {
    if (isProcessing) return

    try {
      setIsProcessing(true)

      const response = await submitDecision(apiRole, letterId, 'approved')

      if (onApprove) {
        await onApprove(response)
      }

      if (onClose) onClose()
    } catch (error) {
      console.error('APPROVE ERROR:', error.response?.data ?? error)
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
    } catch (error) {
      console.error('REJECT ERROR:', error.response?.data ?? error)
      alert(error.response?.data?.message ?? 'Gagal menolak surat.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div>
      {isFinal && (
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

function ReadOnlyStepView({ approverPosition, isFinal }) {
  return (
    <div className="text-sm text-gray-600">
      <p>
        Menunggu keputusan dari: <strong>{approverPosition}</strong>
      </p>
      {isFinal && (
        <span className="inline-block mt-1 px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded">
          Tahap Final
        </span>
      )}
    </div>
  )
}
