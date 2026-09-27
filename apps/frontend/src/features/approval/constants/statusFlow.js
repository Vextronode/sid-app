/* eslint-disable no-unused-vars */
// ==========================================
// statusFlow.js (GLOBAL - MODEL GENERIK)
// ==========================================

// STATUS_BADGE bisa dihapus jika sudah tidak dipakai (karena sudah ada di StatusBadge.jsx)
// Tapi jika masih dipakai di tempat lain, ubah ke generic:
export const STATUS_BADGE = {
  pending: { label: 'Menunggu', className: 'bg-yellow-100 text-yellow-700' },
  in_progress: { label: 'Diproses', className: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Selesai', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Ditolak', className: 'bg-red-100 text-red-700' },
}

/**
 * Fungsi untuk generate Stepper UI secara generik berdasarkan flow_steps surat
 */
export function getStepStatuses(surat) {
  const {
    status,
    current_step_order,
    rejected_at_step,
    flow_steps = [],
    approvals = [],
    diajukan_at,
  } = surat

  // Tahap awal: Submit
  let steps = [{ label: 'Submit', state: 'done', timestamp: diajukan_at }]

  // Loop setiap tahap approval dari database/flow_steps
  flow_steps.forEach((step, index) => {
    const stepOrder = step.step_order

    // Cari data riwayat jika sudah di-approve/reject di tahap ini
    const history = approvals.find((a) => a.flow_step_id === step.id)
    const timestamp = history ? history.created_at : null

    let state = 'waiting'

    if (rejected_at_step === stepOrder) {
      state = 'rejected'
    } else if (current_step_order > stepOrder || status === 'approved') {
      state = 'done'
    } else if (current_step_order === stepOrder && status !== 'rejected') {
      state = 'current'
    }

    // Nama jabatan bisa diformat agar lebih rapi (misal: 'kepala_desa' -> 'Kepala Desa')
    const formatJabatan = step.approver_position
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())

    steps.push({
      label: formatJabatan,
      state: state,
      timestamp: timestamp,
    })
  })

  // Tahap akhir: Selesai
  steps.push({
    label: 'Selesai',
    state: status === 'approved' ? 'done' : 'waiting',
    timestamp: status === 'approved' ? (approvals[approvals.length - 1]?.created_at ?? null) : null,
  })

  return steps
}
