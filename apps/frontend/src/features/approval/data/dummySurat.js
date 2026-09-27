//Flow default 3-tahap-approve: RT -> Kades/Sekdes -> Kasi/Kaur (is_final)
const DEFAULT_FLOW_STEPS = [
  { id: 101, step_order: 1, approver_position: 'rt', is_final: false },
  { id: 102, step_order: 2, approver_position: 'kepala_desa', is_final: false },
  { id: 103, step_order: 3, approver_position: 'kasi_pelayanan', is_final: true },
]

// Rotasi kombinasi (status, current_step_order, rejected_at_step, approvals)
// supaya tiap tahap ada contoh datanya waktu testing UI.
const SCENARIOS = [
  { status: 'pending', current_step_order: 1, rejected_at_step: null, approvals: [] },
  {
    status: 'rejected',
    current_step_order: 1,
    rejected_at_step: 1,
    approvals: [{ flow_step_id: 101, action: 'rejected', created_at: '19 Mei 2026, 10:00' }],
  },
  {
    status: 'in_progress',
    current_step_order: 2,
    rejected_at_step: null,
    approvals: [{ flow_step_id: 101, action: 'approved', created_at: '19 Mei 2026, 10:00' }],
  },
  {
    status: 'rejected',
    current_step_order: 2,
    rejected_at_step: 2,
    approvals: [
      { flow_step_id: 101, action: 'approved', created_at: '19 Mei 2026, 10:00' },
      { flow_step_id: 102, action: 'rejected', created_at: '19 Mei 2026, 11:00' },
    ],
  },
  {
    status: 'in_progress',
    current_step_order: 3,
    rejected_at_step: null,
    approvals: [
      { flow_step_id: 101, action: 'approved', created_at: '19 Mei 2026, 10:00' },
      { flow_step_id: 102, action: 'approved', created_at: '19 Mei 2026, 11:00' },
    ],
  },
  {
    status: 'approved',
    current_step_order: 3,
    rejected_at_step: null,
    approvals: [
      { flow_step_id: 101, action: 'approved', created_at: '19 Mei 2026, 10:00' },
      { flow_step_id: 102, action: 'approved', created_at: '19 Mei 2026, 11:00' },
      { flow_step_id: 103, action: 'approved', created_at: '19 Mei 2026, 12:00' },
    ],
  },
]

export const dummySurat = Array.from({ length: 16 }).map((_, i) => {
  const scenario = SCENARIOS[i % SCENARIOS.length]

  return {
    id: i + 1,
    no_surat: scenario.status === 'approved' ? `02${i + 1}/SKD/V/2026` : null,
    pemohon: 'Budi Santoso',
    pemohon_user_id: 1,
    nik: '****-****-0042',
    alamat: 'Kp. Cibenda RT 001/RW 001',
    jenis: 'SKD',
    jenis_label: 'SKD — Keterangan Domisili',
    keperluan: 'Pembuatan SKCK',
    tanggal: '19 mei 2026',
    diajukan_at: '19 Mei 2026, 09:10',
    terakhir_diproses_at: '19 Mei 2026, 10:23',
    ip_aktor: '192.168.1.12',
    wilayah: 'RT 001, RW001 - Desa Cibenda',

    // Model generik v5.0
    status: scenario.status,
    current_step_order: scenario.current_step_order,
    rejected_at_step: scenario.rejected_at_step,
    flow_steps: DEFAULT_FLOW_STEPS,
    approvals: scenario.approvals,
  }
})
