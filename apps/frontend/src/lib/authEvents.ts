// Endpoint menolak karena peran akun tidak sesuai (403 role_forbidden),
// mis. peran baru saja diubah lewat rotasi/turun jabatan. Dipancarkan oleh
// interceptor di lib/api.ts; AuthContext yang memeriksa apakah perannya
// memang berubah.
export const ROLE_FORBIDDEN_EVENT = 'sid:role-forbidden'
