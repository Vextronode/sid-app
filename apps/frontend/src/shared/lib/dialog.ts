// Dialog peringatan/konfirmasi di dalam aplikasi, pengganti window.alert,
// window.confirm, dan window.prompt (yang tampil sebagai pop-up browser
// berjudul alamat server, mis. "127.0.0.1 says"). Bisa dipanggil dari mana
// saja, termasuk hook dan handler async; <DialogHost /> di main.tsx yang
// merendernya. Dialog dibuka satu per satu sesuai urutan pemanggilan.
import type { ReactNode } from 'react'

export type DialogTone = 'error' | 'warning' | 'success' | 'info' | 'danger' | 'primary'

// Satu kelompok perubahan di dialog konfirmasi (mis. per warga).
export type DialogChangeGroup = {
  title: string
  showOld?: boolean
  rows: { label: string; from?: ReactNode; to?: ReactNode }[]
}

type AlertDialog = {
  kind: 'alert'
  title: string
  message?: ReactNode
  tone: DialogTone
  closeLabel: string
}

type ConfirmDialog = {
  kind: 'confirm'
  title: string
  message?: ReactNode
  details: DialogChangeGroup[] | null
  confirmLabel: string
  cancelLabel: string
  tone: DialogTone
}

type PromptDialog = {
  kind: 'prompt'
  title: string
  message?: ReactNode
  label?: string
  placeholder: string
  minLength: number
  confirmLabel: string
  cancelLabel: string
  tone: DialogTone
}

type DialogRequest = AlertDialog | ConfirmDialog | PromptDialog

export type DialogEntry = DialogRequest & {
  id: number
  resolve: (value: unknown) => void
}

let queue: DialogEntry[] = []
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function open<T>(dialog: DialogRequest) {
  return new Promise<T>((resolve) => {
    queue = [
      ...queue,
      { ...dialog, id: Date.now() + Math.random(), resolve: resolve as (value: unknown) => void },
    ]
    emit()
  })
}

export function subscribeDialogs(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function currentDialog() {
  return queue[0] ?? null
}

export function resolveDialog(value: unknown) {
  const [first, ...rest] = queue
  if (!first) return

  queue = rest
  first.resolve(value)
  emit()
}

// Pemberitahuan dengan satu tombol.
export function alertDialog({
  title = 'Terjadi kesalahan',
  message,
  tone = 'error',
  closeLabel = 'Tutup',
}: {
  title?: string
  message?: ReactNode
  tone?: 'error' | 'warning' | 'success' | 'info'
  closeLabel?: string
}) {
  return open<void>({ kind: 'alert', title, message, tone, closeLabel })
}

// Konfirmasi ya/tidak; resolve true bila dikonfirmasi. tone 'danger' untuk
// aksi yang menghapus data. details (opsional): daftar perubahan yang
// dikonfirmasi.
export function confirmDialog({
  title = 'Konfirmasi',
  message,
  details = null,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  tone = 'danger',
}: {
  title?: string
  message?: ReactNode
  details?: DialogChangeGroup[] | null
  confirmLabel?: string
  cancelLabel?: string
  tone?: DialogTone
}) {
  return open<boolean>({
    kind: 'confirm',
    title,
    message,
    details,
    confirmLabel,
    cancelLabel,
    tone,
  })
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
}: {
  title: string
  message?: ReactNode
  label?: string
  placeholder?: string
  minLength?: number
  confirmLabel?: string
  cancelLabel?: string
}) {
  return open<string | null>({
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
