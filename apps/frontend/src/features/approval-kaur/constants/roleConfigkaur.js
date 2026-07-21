// ==========================================
// roleConfigkaur.js
// Config lokal Kaur TU Umum. Tahap FINAL approval, tapi HANYA untuk
// jenis surat yang jadi tanggung jawabnya (lihat jenisSuratConfig.js).
// Setuju di sini otomatis menerbitkan no_surat.
// ==========================================

export const ROLE_LABEL = 'Kaur TU Umum';
export const ROLE_KEY = 'kaur'; // dipakai untuk filter jenis surat
export const PENDING_STATUS = 'kadus_approved';
export const ACTION_RESULT = { approve: 'kaur_approved', reject: 'kaur_rejected' };
export const RELEVANT_STATUSES = ['kadus_approved', 'kaur_approved', 'kaur_rejected'];
export const BASE_PATH = '/admin/dashboard-surat-kaur';