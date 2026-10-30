// Notifikasi singkat (toast) setelah aksi berhasil, mis. "Data warga
// berhasil disimpan". Seperti dialog.ts, store-nya di level modul sehingga
// bisa dipanggil dari mana saja dan tetap tampil walau halaman berpindah
// (mis. setelah mengajukan surat). <ToastHost /> di main.tsx yang merender.

const MAX_VISIBLE = 3
const DEFAULT_DURATION = 3000

let toasts = []
let nextId = 1
const listeners = new Set()

function emit() {
  listeners.forEach((listener) => listener())
}

export function subscribeToasts(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function currentToasts() {
  return toasts
}

export function dismissToast(id) {
  if (!toasts.some((toast) => toast.id === id)) return

  toasts = toasts.filter((toast) => toast.id !== id)
  emit()
}

// tone: 'success' | 'info'. duration dalam milidetik; ToastHost yang
// menjalankan timernya (berhenti saat kursor/fokus berada di toast).
export function notify({ message, tone = 'success', duration = DEFAULT_DURATION }) {
  const id = nextId++

  toasts = [...toasts, { id, message, tone, duration }].slice(-MAX_VISIBLE)
  emit()

  return id
}

export function notifySuccess(message, options = {}) {
  return notify({ ...options, message, tone: 'success' })
}
