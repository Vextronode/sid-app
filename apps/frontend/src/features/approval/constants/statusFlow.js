// ==========================================
// statusFlow.js (GLOBAL)
// Alur baru: Submit -> RT -> RW (FINAL) -> Selesai.
// Kadus/Petugas Desa/Kasi/Kaur bukan approver lagi, cuma monitoring & cetak.
// ==========================================

export const STATUS_BADGE = {
  pending: { label: 'pending', className: 'bg-yellow-100 text-yellow-700' },
  rt_approved: { label: 'rt_approved', className: 'bg-green-100 text-green-700' },
  rt_rejected: { label: 'rt_rejected', className: 'bg-red-100 text-red-700' },
  rw_approved: { label: 'rw_approved', className: 'bg-emerald-100 text-emerald-700' },
  rw_rejected: { label: 'rw_rejected', className: 'bg-red-100 text-red-700' },
};

export const STEP_LABELS = ['Submit', 'RT', 'RW', 'Selesai'];

export function getStepIndex(status) {
  const map = { pending: 1, rt_approved: 2, rt_rejected: 2, rw_approved: 3, rw_rejected: 3 };
  return map[status] ?? 0;
}

export function getStepStatuses(surat) {
  const { status, riwayat = [], diajukan_at, terakhir_diproses_at } = surat;
  const findRiwayat = (tahap) => riwayat.find((r) => r.tahap === tahap);

  const rtDone = status !== 'pending';
  const rtRejected = status === 'rt_rejected';
  const rtEntry = findRiwayat('RT');

  const rwStarted = status !== 'pending' && status !== 'rt_rejected';
  const rwDone = status === 'rw_approved';
  const rwRejected = status === 'rw_rejected';
  const rwEntry = findRiwayat('RW');

  return [
    { label: 'Submit', state: 'done', timestamp: diajukan_at },
    { label: 'RT', state: rtRejected ? 'rejected' : rtDone ? 'done' : 'current', timestamp: rtEntry?.waktu ?? (rtDone ? terakhir_diproses_at : null) },
    { label: 'RW', state: rwRejected ? 'rejected' : rwDone ? 'done' : rwStarted ? 'current' : 'waiting', timestamp: rwEntry?.waktu ?? null },
    { label: 'Selesai', state: rwDone ? 'done' : 'waiting', timestamp: null },
  ];
}