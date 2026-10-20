// Dialog peringatan/konfirmasi di dalam aplikasi, pengganti window.alert,
// window.confirm, dan window.prompt (yang tampil sebagai pop-up browser
// berjudul alamat server, mis. "127.0.0.1 says"). Bisa dipanggil dari mana
// saja, termasuk hook dan handler async; <DialogHost /> di main.jsx yang
// merendernya. Dialog dibuka satu per satu sesuai urutan pemanggilan.

let queue = []
const listeners = new Set()

function emit() {
  listeners.forEach((listener) => listener())
}

function open(dialog) {
  return new Promise((resolve) => {
    queue = [...queue, { ...dialog, id: Date.now() + Math.random(), resolve }]
    emit()
  })
}

export function subscribeDialogs(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function currentDialog() {
  return queue[0] ?? null
}

export function resolveDialog(value) {
  const [first, ...rest] = queue
  if (!first) return

  queue = rest
  first.resolve(value)
  emit()
}

// Pemberitahuan dengan satu tombol. tone: 'error' | 'warning' | 'success' | 'info'.
export function alertDialog({
  title = 'Terjadi kesalahan',
  message,
  tone = 'error',
  closeLabel = 'Tutup',
}) {
  return open({ kind: 'alert', title, message, tone, closeLabel })
}

// Konfirmasi ya/tidak; resolve true bila dikonfirmasi. tone 'danger' untuk
// aksi yang menghapus data.
export function confirmDialog({
  title = 'Konfirmasi',
  message,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  tone = 'danger',
}) {
  return open({ kind: 'confirm', title, message, confirmLabel, cancelLabel, tone })
}

// Isian teks singkat; resolve string (sudah di-trim) atau null bila batal.
export function promptDialog({
  title,
  message,
  label,
  placeholder = '',
  minLength = 0,
  confirmLabel = 'Simpan',
  cancelLabel = 'Batal',
}) {
  return open({
    kind: 'prompt',
    title,
    message,
    label,
    placeholder,
    minLength,
    confirmLabel,
    cancelLabel,
    tone: 'primary',
  })
}
