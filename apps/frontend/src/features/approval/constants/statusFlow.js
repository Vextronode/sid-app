// ==========================================
// statusFlow.js
// GLOBAL - MODEL GENERIK APPROVAL FLOW
// ==========================================

export const STATUS_BADGE = {
  pending: {
    label: 'Menunggu',
    className: 'bg-yellow-100 text-yellow-700',
  },

  in_progress: {
    label: 'Diproses',
    className: 'bg-blue-100 text-blue-700',
  },

  approved: {
    label: 'Selesai',
    className: 'bg-green-100 text-green-700',
  },

  rejected: {
    label: 'Ditolak',
    className: 'bg-red-100 text-red-700',
  },
}

// ==========================================
// GET FLOW STEPS
// ==========================================

export function getFlowSteps(surat) {
  if (Array.isArray(surat?.flow_steps)) {
    return surat.flow_steps
  }

  if (Array.isArray(surat?.flow?.steps)) {
    return surat.flow.steps
  }

  return []
}

// ==========================================
// GET CURRENT FLOW STEP
// ==========================================

export function getCurrentFlowStep(surat) {
  const flowSteps = getFlowSteps(surat)

  if (!flowSteps.length) {
    return null
  }

  const currentStepOrder = Number(surat?.current_step_order)

  return flowSteps.find((step) => Number(step?.step_order) === currentStepOrder) ?? null
}

// ==========================================
// GET APPROVAL HISTORY PER STEP
// ==========================================

function getLatestApprovalForStep(approvals, stepId) {
  const histories = approvals
    .filter((approval) => Number(approval?.flow_step_id) === Number(stepId) && approval?.action)
    .sort((a, b) => new Date(a?.created_at ?? 0) - new Date(b?.created_at ?? 0))

  return histories.at(-1) ?? null
}

// ==========================================
// FORMAT JABATAN
// ==========================================

function formatJabatan(position) {
  return String(position ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

// ==========================================
// GENERATE TRACKER STATUS
// ==========================================

export function getStepStatuses(surat) {
  const { status, current_step_order, rejected_at_step, approvals = [] } = surat ?? {}

  const flowSteps = getFlowSteps(surat)

  const submittedAt = surat?.submitted_at ?? surat?.diajukan_at ?? null

  const steps = [
    {
      label: 'Submit',
      state: 'done',
      timestamp: submittedAt,
    },
  ]

  flowSteps.forEach((step) => {
    const stepOrder = Number(step?.step_order)

    const history = getLatestApprovalForStep(approvals, step?.id)

    let state = 'waiting'

    if (Number(rejected_at_step) === stepOrder) {
      state = 'rejected'
    } else if (status === 'approved' || Number(current_step_order) > stepOrder) {
      state = 'done'
    } else if (Number(current_step_order) === stepOrder && status !== 'rejected') {
      state = 'current'
    }

    steps.push({
      label: formatJabatan(step?.approver_position),
      state,
      timestamp: history?.created_at ?? null,
      approverPosition: step?.approver_position ?? null,
      stepOrder,
      isFinal: Boolean(step?.is_final),
    })
  })

  steps.push({
    label: 'Selesai',
    state: status === 'approved' ? 'done' : 'waiting',
    timestamp:
      status === 'approved'
        ? (approvals
            .filter((approval) => approval?.action === 'approved')
            .sort((a, b) => new Date(a?.created_at ?? 0) - new Date(b?.created_at ?? 0))
            .at(-1)?.created_at ?? null)
        : null,
  })

  return steps
}
