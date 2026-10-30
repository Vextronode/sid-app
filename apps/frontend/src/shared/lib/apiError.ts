// Pesan error untuk pengguna. Hanya memakai pesan dari backend (berbahasa
// Indonesia) atau error yang sengaja dibuat untuk pengguna (`userFacing`),
// tidak pernah pesan teknis axios/browser seperti "Network Error" atau
// "Request failed with status code 500".
export function getApiErrorMessage(error, fallback) {
  const errors = error?.response?.data?.errors

  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat()[0]

    if (first) return first
  }

  const message = error?.response?.data?.message

  if (typeof message === 'string' && message) return message
  if (error?.userFacing && error.message) return error.message

  return fallback
}

// Error yang pesannya aman ditampilkan apa adanya.
export function userFacingError(message) {
  const error = new Error(message)
  error.userFacing = true

  return error
}

// Untuk respons fetch yang gagal: ambil `message` JSON dari backend bila
// ada, selain itu pakai pesan cadangan berbahasa Indonesia.
export async function responseError(response, fallback) {
  let message = fallback

  try {
    const data = JSON.parse(await response.text())

    if (typeof data?.message === 'string' && data.message) message = data.message
  } catch {
    // Body bukan JSON (mis. halaman HTML error): pakai pesan cadangan.
  }

  return userFacingError(message)
}
