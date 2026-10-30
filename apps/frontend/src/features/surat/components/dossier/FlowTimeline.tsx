// ==========================================
// FlowTimeline.tsx
// Tahapan alur surat secara vertikal (Diajukan -> RT -> Kades -> Selesai)
// untuk panel berkas.
//
// - detailed: untuk pejabat; menampilkan siapa yang memutus, kapan, dan
//   catatannya.
// - generic: untuk pemohon; hanya tahap dan status generik, tanpa nama
//   pejabat.
// ==========================================

import { SURAT_STATUS } from '@/constants/suratStatus'
import { getLatestApprovalForLevel } from '@/features/approval/constants/statusFlow'
import { getLetterTrackingState } from '@/features/surat/utils/letterDetails'
import { formatDossierDateTime, getApprovalActor } from './dossierFormat'

const STEPS = [
  { key: 'submit', label: 'Diajukan', levels: [] },
  { key: 'rt', label: 'RT', levels: ['rt'] },
  { key: 'kades', label: 'Kepala Desa / Sekdes', levels: ['kepala_desa', 'sekretaris_desa'] },
  { key: 'done', label: 'Surat terbit', levels: [] },
]

// Langkah UI 1 = Diajukan; backend step 1 = RT, step 2 = persetujuan final.
function getDetailedState(surat) {
  const currentStepOrder = Number(surat?.current_step_order) || 1

  if (surat?.status === SURAT_STATUS.REJECTED) {
    const rejectedStep = (Number(surat?.rejected_at_step) || currentStepOrder) + 1

    return { currentStep: rejectedStep, rejectedStep, completed: false }
  }

  if (surat?.status === SURAT_STATUS.APPROVED) {
    return { currentStep: STEPS.length, rejectedStep: null, completed: true }
  }

  return {
    currentStep: Math.min(Math.max(currentStepOrder + 1, 2), STEPS.length - 1),
    rejectedStep: null,
    completed: false,
  }
}

function stepState(stepNumber, { currentStep, rejectedStep, completed }) {
  if (!completed && rejectedStep === stepNumber) return 'rejected'
  if (completed || stepNumber < currentStep) return 'done'
  if (stepNumber === currentStep) return 'current'

  return 'waiting'
}

const STATE_TEXT = {
  done: 'Selesai',
  current: 'Sedang diproses',
  waiting: 'Menunggu',
  rejected: 'Ditolak',
}

export function FlowTimeline({ surat, variant = 'detailed' }) {
  const generic = variant === 'generic'
  const state = generic ? getLetterTrackingState(surat) : getDetailedState(surat)
  const approvals = surat?.approvals ?? []

  return (
    <ol className="sid-dossier-timeline sid-dossier-flow">
      {STEPS.map((step, index) => {
        const status = stepState(index + 1, state)
        const decision = generic ? null : getLatestApprovalForLevel(approvals, step.levels)

        let meta = null

        if (step.key === 'submit') {
          meta = formatDossierDateTime(surat?.submitted_at ?? surat?.created_at)
        } else if (step.key === 'done' && status === 'done') {
          meta = formatDossierDateTime(surat?.processed_at ?? surat?.updated_at)
        } else if (decision && (status === 'done' || status === 'rejected')) {
          meta = `${getApprovalActor(decision)}, ${formatDossierDateTime(decision.created_at) ?? '-'}`
        }

        return (
          <li
            key={step.key}
            className={status}
            aria-current={status === 'current' ? 'step' : undefined}
          >
            <p className="sid-dossier-timeline-title">
              {step.label} <span>{STATE_TEXT[status]}</span>
            </p>
            {meta && <p className="sid-dossier-timeline-meta">{meta}</p>}
            {decision?.notes && (status === 'done' || status === 'rejected') && (
              <p className="sid-dossier-timeline-note">{decision.notes}</p>
            )}
          </li>
        )
      })}
    </ol>
  )
}
