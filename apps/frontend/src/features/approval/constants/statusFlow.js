/* eslint-disable no-unused-vars */
export const APPROVAL_FLOW = ['pending', 'rt', 'rw', 'kadus', 'petugas'];

// Label & warna badge untuk tiap status yang mungkin muncul
export const STATUS_BADGE = {
  pending: { label: 'pending', className: 'bg-yellow-100 text-yellow-700' },
  rt_approved: { label: 'rt_approved', className: 'bg-green-100 text-green-700' },
  rt_rejected: { label: 'rt_rejected', className: 'bg-red-100 text-red-700' },
  rw_approved: { label: 'rw_approved', className: 'bg-green-100 text-green-700' },
  rw_rejected: { label: 'rw_rejected', className: 'bg-red-100 text-red-700' },
  kadus_approved: { label: 'kadus_approved', className: 'bg-green-100 text-green-700' },
  kadus_rejected: { label: 'kadus_rejected', className: 'bg-red-100 text-red-700' },
  kaur_approved: { label: 'kaur_approved', className: 'bg-emerald-100 text-emerald-700' },
  kaur_rejected: { label: 'kaur_rejected', className: 'bg-red-100 text-red-700' },
  kasi_approved: { label: 'kasi_approved', className: 'bg-emerald-100 text-emerald-700' },
  kasi_rejected: { label: 'kasi_rejected', className: 'bg-red-100 text-red-700' },
};

// Progress stepper (dipakai di halaman detail semua role)
export const STEP_LABELS = ['Submit', 'RT', 'RW', 'Kadus', 'Kasi/Kaur', 'Selesai'];

// Hitung currentStep untuk ApprovalStepper berdasarkan status surat saat ini
export function getStepIndex(status) {
  const map = {
    pending: 1,
    rt_approved: 2,
    rt_rejected: 2,
    rw_approved: 3,
    rw_rejected: 3,
    kadus_approved: 4,
    kadus_rejected: 4,
    kaur_approved: 5, 
    kaur_rejected: 5,
    kasi_approved: 5, 
    kasi_rejected: 5,
  };
  return map[status] ?? 0;
}

export function getStepStatuses(surat) {
  const { status, riwayat = [], diajukan_at, terakhir_diproses_at } = surat;

  const findRiwayat = (tahap) => riwayat.find((r) => r.tahap === tahap);

  const rtDone = status !== 'pending';
  const rtRejected = status === 'rt_rejected';
  const rtEntry = findRiwayat('RT');

  const afterRW = ['rw_approved', 'kadus_approved', 'kadus_rejected', 'petugas_approved', 'petugas_rejected'];
  const rwStarted = ['rt_approved', 'rw_approved', 'rw_rejected', ...afterRW].includes(status);
  const rwDone = afterRW.includes(status);
  const rwRejected = status === 'rw_rejected';
  const rwEntry = findRiwayat('RW');

  const afterKadus = ['kadus_approved', 'petugas_approved', 'petugas_rejected'];
  const kadusStarted = ['rw_approved', 'kadus_approved', 'kadus_rejected', ...afterKadus].includes(status);
  const kadusDone = afterKadus.includes(status);
  const kadusRejected = status === 'kadus_rejected';
  const kadusEntry = findRiwayat('Kadus');

  const finalStarted = ['kadus_approved', 'kaur_approved', 'kaur_rejected', 'kasi_approved', 'kasi_rejected'].includes(status);
  const finalDone = status === 'kaur_approved' || status === 'kasi_approved';
  const finalRejected = status === 'kaur_rejected' || status === 'kasi_rejected';
  const finalEntry = findRiwayat('Kaur TU Umum') ?? findRiwayat('Kasi Pelayanan');

  return [
    { label: 'Submit', state: 'done', timestamp: diajukan_at },
    { label: 'RT', state: rtRejected ? 'rejected' : rtDone ? 'done' : 'current', timestamp: rtEntry?.waktu ?? (rtDone ? terakhir_diproses_at : null) },
    { label: 'RW', state: rwRejected ? 'rejected' : rwDone ? 'done' : rwStarted ? 'current' : 'waiting', timestamp: rwEntry?.waktu ?? null },
    { label: 'Kadus', state: kadusRejected ? 'rejected' : kadusDone ? 'done' : kadusStarted ? 'current' : 'waiting', timestamp: kadusEntry?.waktu ?? null },
    { label: 'Kasi/Kaur', state: finalRejected ? 'rejected' : finalDone ? 'done' : finalStarted ? 'current' : 'waiting', timestamp: finalEntry?.waktu ?? null },
    { label: 'Selesai', state: finalDone ? 'done' : 'waiting', timestamp: null },
  ];
}