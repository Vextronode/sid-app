// ==========================================
// ApprovalStepper.jsx
//
// Generic progress tracker surat.
//
// Flow UI:
// Submit -> RT -> Kades -> Selesai
//
// Catatan:
// - Tidak menggunakan flow_steps.
// - Tidak menentukan kewenangan approve/reject.
// - Approval action tetap ditangani
//   oleh ApprovalStepRenderer.
// ==========================================

import { Check, Loader2, X } from 'lucide-react'

import { SURAT_STATUS } from '@/constants/suratStatus'

// ==========================================
// STEPS
// ==========================================

const STEPS = [
  {
    key: 'submit',
    label: 'Submit',
  },
  {
    key: 'rt',
    label: 'RT',
  },
  {
    key: 'kades',
    label: 'Kades',
  },
  {
    key: 'selesai',
    label: 'Selesai',
  },
]

// ==========================================
// HELPERS
// ==========================================

function getApprovalTimestamp(surat, stepKey) {
  const approvals = surat?.approvals ?? []

  // Map step keys to approval_level values coming from BE
  const STEP_TO_LEVELS = {
    rt: ['rt'],
    kades: ['kepala_desa', 'sekdes', 'sekretaris_desa'],
    selesai: [],
  }

  const levels = STEP_TO_LEVELS[stepKey]

  // If no explicit levels (eg. submit/selesai), derive from last approved approval
  if (!levels || levels.length === 0) {
    const approval = approvals
      .filter((a) => a?.action === 'approved')
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .at(-1)

    return approval?.created_at ?? null
  }

  const approval = approvals
    .filter((a) => levels.includes(a?.approval_level) && a?.action === 'approved')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .at(-1)

  return approval?.created_at ?? null
}

function getStepState(surat) {
  const status = surat?.status
  const currentStepOrder = Number(surat?.current_step_order) || 1

  const rejectedAtStep = Number(surat?.rejected_at_step)

  if (status === SURAT_STATUS.REJECTED) {
    const rejectedStep = (rejectedAtStep || currentStepOrder) + 1

    return {
      currentStep: rejectedStep,
      rejectedStep,
      completed: false,
    }
  }

  if (status === SURAT_STATUS.APPROVED) {
    return {
      currentStep: STEPS.length,
      rejectedStep: null,
      completed: true,
    }
  }

  return {
    // Backend step 1 is RT and step 2 is final approval; Submit is UI step 1.
    currentStep: Math.min(Math.max(currentStepOrder + 1, 2), STEPS.length - 1),
    rejectedStep: null,
    completed: false,
  }
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return null
  }

  return new Date(timestamp).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ==========================================
// COMPONENT
// ==========================================

export default function ApprovalStepper({ surat }) {
  const { currentStep, rejectedStep, completed } = getStepState(surat)

  return (
    <div className="sid-stepper">
      {STEPS.map((step, index) => {
        const stepNumber = index + 1

        // =====================================
        // REJECTED
        // =====================================

        const isRejected = !completed && rejectedStep === stepNumber

        // =====================================
        // DONE
        // =====================================

        const isDone = completed || (!isRejected && stepNumber < currentStep)

        // =====================================
        // CURRENT
        // =====================================

        const isCurrent = !completed && !isRejected && stepNumber === currentStep

        // =====================================
        // STATE CLASS
        // =====================================

        const stepClass = isRejected
          ? 'rejected'
          : isDone
            ? 'done'
            : isCurrent
              ? 'current'
              : 'waiting'

        // =====================================
        // TIMESTAMP
        // =====================================

        let timestamp = null

        if (step.key === 'submit') {
          timestamp = surat?.submitted_at ?? null
        }

        if (step.key === 'rt') {
          timestamp = getApprovalTimestamp(surat, 'rt')
        }

        if (step.key === 'kades') {
          timestamp = getApprovalTimestamp(surat, 'kades')
        }

        if (step.key === 'selesai') {
          timestamp = getApprovalTimestamp(surat, 'selesai')
        }

        // =====================================
        // STATUS TEXT
        // =====================================

        let statusText = 'Menunggu'

        if (isRejected) {
          statusText = 'Ditolak'
        } else if (isDone) {
          statusText = 'Selesai'
        } else if (isCurrent) {
          statusText = step.key === 'selesai' ? 'Menunggu penyelesaian' : 'Sedang diproses'
        }

        // =====================================
        // CIRCLE
        // =====================================

        let circle

        if (isRejected) {
          circle = (
            <div className="sid-stepper-circle rejected">
              <X size={18} />
            </div>
          )
        } else if (isDone) {
          circle = (
            <div className="sid-stepper-circle done">
              <Check size={18} />
            </div>
          )
        } else if (isCurrent) {
          circle = (
            <div className="sid-stepper-circle current">
              <Loader2 size={16} className="animate-spin" />
            </div>
          )
        } else {
          circle = <div className="sid-stepper-circle waiting">{stepNumber}</div>
        }

        return (
          <div key={step.key} className="sid-stepper-item">
            <div className="sid-stepper-content">
              {circle}

              <span className={`sid-stepper-label ${stepClass}`}>{step.label}</span>

              <span className="sid-stepper-status">{statusText}</span>

              {timestamp && (
                <span className="sid-stepper-status">{formatTimestamp(timestamp)}</span>
              )}
            </div>

            {index < STEPS.length - 1 && (
              <div
                className={`sid-stepper-connector ${
                  stepNumber < currentStep || completed ? 'done' : ''
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
