// ==========================================
// roleConfig.js (LOKAL — khusus Kadus)
// Kadus hanya bisa proses surat yang statusnya "rw_approved" (sudah lolos RW).
// ==========================================

export const ROLE_LABEL = 'Kadus';
export const PENDING_STATUS = 'rw_approved';
export const ACTION_RESULT = { approve: 'kadus_approved', reject: 'kadus_rejected' };
export const RELEVANT_STATUSES = ['rw_approved', 'kadus_approved', 'kadus_rejected'];
export const LIST_TITLE = {
  semua: 'Semua permohonan surat',
  pending: 'Surat Pending Kadus',
  approved: 'Surat Approved',
  rejected: 'Surat Rejected Kadus',
};
export const BASE_PATH = '/admin/dashboard-surat-kadus';