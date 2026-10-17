// Nama aplikasi yang tampil ke pengguna. Diatur lewat VITE_APP_NAME (samakan
// dengan SID_APP_NAME di backend) supaya bisa diganti tanpa mengubah kode.
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'SIDUTama'

// Label peran staf pemegang aplikasi (kode peran: staf_sid).
export const STAF_APP_LABEL = `Staf ${APP_NAME}`
