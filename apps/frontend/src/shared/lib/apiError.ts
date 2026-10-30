import type { ApiErrorBody } from '@/types'

// Error yang pesannya boleh ditampilkan apa adanya ke pengguna.
export type UserFacingError = Error & { userFacing: true }

// Pesan error untuk pengguna. Hanya memakai pesan dari backend (berbahasa
// Indonesia) atau error yang sengaja dibuat untuk pengguna (`userFacing`),
// tidak pernah pesan teknis axios/browser seperti "Network Error" atau
// "Request failed with status code 500".
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const err = error as
    | { response?: { data?: ApiErrorBody }; userFacing?: boolean; message?: string }
    | null
    | undefined
  const errors = err?.response?.data?.errors

  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat()[0]

    if (first) return first
  }

  const message = err?.response?.data?.message

  if (typeof message === 'string' && message) return message
  if (err?.userFacing && err.message) return err.message

  return fallback
}

// Error yang pesannya aman ditampilkan apa adanya.
export function userFacingError(message: string): UserFacingError {
  const error = new Error(message) as UserFacingError
  error.userFacing = true

  return error
}

// Untuk respons fetch yang gagal: ambil `message` JSON dari backend bila
// ada, selain itu pakai pesan cadangan berbahasa Indonesia.
export async function responseError(response: Response, fallback: string) {
  let message = fallback

  try {
    const data = JSON.parse(await response.text())

    if (typeof data?.message === 'string' && data.message) message = data.message
  } catch {
    // Body bukan JSON (mis. halaman HTML error): pakai pesan cadangan.
  }

  return userFacingError(message)
}
