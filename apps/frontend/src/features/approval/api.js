import api from '@/lib/api';

export const getSuratList = (role, params) => api.get(`/${role}/surat`, { params });
export const getSuratDetail = (role, id) => api.get(`/${role}/surat/${id}`);
export const approveSurat = (role, id) => api.post(`/${role}/surat/${id}/approve`);
export const rejectSurat = (role, id, alasan) => api.post(`/${role}/surat/${id}/reject`, { alasan });