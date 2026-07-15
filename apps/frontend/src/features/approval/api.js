// ==========================================
// api.js
// Kerangka fungsi request ke backend untuk fitur approval RT/RW.
// Masih STUB — begitu backend siap, hooks tinggal ganti sumber data
// ke fungsi-fungsi ini, tanpa perlu ubah komponen UI.
// ==========================================

import api from '@/lib/api';

// Ambil daftar surat sesuai role & tab, contoh: GET /rt/surat?status=pending
export const getSuratList = (role, params) => api.get(`/${role}/surat`, { params });

// Ambil detail satu surat
export const getSuratDetail = (role, id) => api.get(`/${role}/surat/${id}`);

// Setujui surat pada tahap role yang sedang login
export const approveSurat = (role, id) => api.post(`/${role}/surat/${id}/approve`);

// Tolak surat, alasan wajib dikirim
export const rejectSurat = (role, id, alasan) => api.post(`/${role}/surat/${id}/reject`, { alasan });