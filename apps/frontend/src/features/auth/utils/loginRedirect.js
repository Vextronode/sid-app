import { HAL_LOGIN } from '@/lib/constants/routes'
import { isWargaLetterPath, letterTargetForRole } from './letterLinks'

// Tujuan ?redirect= yang boleh dipakai setelah login (K4).
// Halaman warga; untuk pejabat, halaman surat warga dipetakan ke padanannya
// (letterTargetForRole), selain itu memakai pengalihan per role.
const WARGA_REDIRECT_PATTERNS = [
  /^\/jenis-surat$/,
  /^\/pengajuan-surat$/,
  /^\/pengajuan-surat\/[^/]+$/,
  /^\/surat-saya\/daftar$/,
  /^\/surat-saya$/,
  /^\/profil$/,
]

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/

// Path internal = diawali tepat satu "/", tanpa "//", "\", skema,
// atau karakter kontrol. Mencegah open redirect ke situs lain.
export function isSafeInternalPath(path) {
  if (typeof path !== 'string' || path.length === 0) return false
  if (!path.startsWith('/') || path.startsWith('//')) return false
  if (path.includes('\\') || CONTROL_CHARS.test(path)) return false

  const pathname = path.split(/[?#]/)[0]
  if (pathname.includes('//') || pathname.includes(':')) return false

  return true
}

// Mengembalikan path tujuan bila redirect aman dan diizinkan untuk role,
// selain itu null (pemanggil memakai pengalihan per role yang lama).
export function resolveLoginRedirect(redirect, role) {
  if (!role || !isSafeInternalPath(redirect)) return null

  if (role !== 'warga') {
    return isWargaLetterPath(redirect) ? letterTargetForRole(redirect, role) : null
  }

  const pathname = redirect.split(/[?#]/)[0]
  const allowed = WARGA_REDIRECT_PATTERNS.some((pattern) => pattern.test(pathname))

  return allowed ? redirect : null
}

// URL halaman login yang membawa tujuan kembali, mis.
// buildLoginPath('/jenis-surat') -> '/login?redirect=%2Fjenis-surat'
export function buildLoginPath(target) {
  if (!isSafeInternalPath(target)) return HAL_LOGIN

  return `${HAL_LOGIN}?${new URLSearchParams({ redirect: target })}`
}
