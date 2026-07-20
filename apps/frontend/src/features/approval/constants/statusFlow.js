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
  petugas_approved: { label: 'petugas_approved', className: 'bg-emerald-100 text-emerald-700' },
  petugas_rejected: { label: 'petugas_rejected', className: 'bg-red-100 text-red-700' },
};

// Progress stepper (dipakai di halaman detail semua role)
export const STEP_LABELS = ['Submit', 'RT', 'RW', 'Kadus', 'Petugas Desa', 'Selesai'];

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
    petugas_approved: 5,
    petugas_rejected: 5,
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

  const petugasStarted = ['kadus_approved', 'petugas_approved', 'petugas_rejected'].includes(status);
  const petugasDone = status === 'petugas_approved';
  const petugasRejected = status === 'petugas_rejected';
  const petugasEntry = findRiwayat('Petugas Desa');

  return [
    { label: 'Submit', state: 'done', timestamp: diajukan_at },
    { label: 'RT', state: rtRejected ? 'rejected' : rtDone ? 'done' : 'current', timestamp: rtEntry?.waktu ?? (rtDone ? terakhir_diproses_at : null) },
    { label: 'RW', state: rwRejected ? 'rejected' : rwDone ? 'done' : rwStarted ? 'current' : 'waiting', timestamp: rwEntry?.waktu ?? null },
    { label: 'Kadus', state: kadusRejected ? 'rejected' : kadusDone ? 'done' : kadusStarted ? 'current' : 'waiting', timestamp: kadusEntry?.waktu ?? null },
    { label: 'Petugas Desa', state: petugasRejected ? 'rejected' : petugasDone ? 'done' : petugasStarted ? 'current' : 'waiting', timestamp: petugasEntry?.waktu ?? null },
    { label: 'Selesai', state: petugasDone ? 'done' : 'waiting', timestamp: null },
  ];
}