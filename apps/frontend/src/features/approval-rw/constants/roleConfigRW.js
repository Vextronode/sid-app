export const ROLE_LABEL = 'RW';
export const PENDING_STATUS = 'rt_approved';
export const ACTION_RESULT = { approve: 'rw_approved', reject: 'rw_rejected' };
// Status yang relevan buat RW: mulai dari antrian, sampai hasil aksi RW sendiri.
export const RELEVANT_STATUSES = ['rt_approved', 'rw_approved', 'rw_rejected'];
export const LIST_TITLE = {
  semua: 'Semua permohonan surat',
  pending: 'Surat Pending RW',
  approved: 'Surat Approved',
  rejected: 'Surat Rejected RW',
};
export const BASE_PATH = '/admin/dashboard-surat-rw';