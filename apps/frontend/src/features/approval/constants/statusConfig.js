// ==========================================
// statusConfig.js
// Sumber tunggal untuk semua status surat: daftar status, warna badge,
// mapping status "pending queue" per role, dan hasil approve/reject per role.
// ==========================================

export const STATUS = {
  PENDING: 'pending',
  RT_APPROVED: 'rt_approved',
  RT_REJECTED: 'rt_rejected',
  RW_REVIEW: 'rw_review',
  RW_APPROVED: 'rw_approved',
  RW_REJECTED: 'rw_rejected',
};

// Label & warna badge tiap status (dipakai StatusBadge.jsx)
export const STATUS_BADGE = {
  [STATUS.PENDING]: { label: 'pending', className: 'bg-yellow-100 text-yellow-700' },
  [STATUS.RT_APPROVED]: { label: 'rt_approved', className: 'bg-green-100 text-green-700' },
  [STATUS.RT_REJECTED]: { label: 'rt_rejected', className: 'bg-red-100 text-red-700' },
  [STATUS.RW_REVIEW]: { label: 'rw_review', className: 'bg-blue-100 text-blue-700' },
  [STATUS.RW_APPROVED]: { label: 'rw_approved', className: 'bg-green-100 text-green-700' },
  [STATUS.RW_REJECTED]: { label: 'rw_rejected', className: 'bg-red-100 text-red-700' },
};

// Menentukan status mana yang termasuk "antrian pending" untuk tiap role.
// RT lihat surat status "pending", RW lihat surat yang sudah "rt_approved".
export const PENDING_STATUS_BY_ROLE = {
  rt: STATUS.PENDING,
  rw: STATUS.RT_APPROVED,
};

// Status hasil aksi approve/reject, tergantung role yang sedang login.
export const ACTION_RESULT_BY_ROLE = {
  rt: { approve: STATUS.RT_APPROVED, reject: STATUS.RT_REJECTED },
  rw: { approve: STATUS.RW_APPROVED, reject: STATUS.RW_REJECTED },
};

// Judul tabel/section, berubah sesuai role + tab aktif (dipakai ApprovalListPage.jsx)
export const LIST_TITLE_BY_ROLE = {
  rt: {
    semua: 'Semua permohonan surat',
    pending: 'Surat Pending RT',
    approved: 'Surat Approved',
    rejected: 'Surat Rejected RT',
  },
  rw: {
    semua: 'Semua permohonan surat',
    pending: 'Surat Pending RW',
    approved: 'Surat Approved',
    rejected: 'Surat Rejected RW',
  },
};