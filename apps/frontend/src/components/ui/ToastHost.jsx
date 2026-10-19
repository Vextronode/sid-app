import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Info, X } from 'lucide-react'

import { currentToasts, dismissToast, subscribeToasts } from '@/shared/lib/toast'

const ICONS = { success: CheckCircle2, info: Info }

// Wadah toast di pojok kanan bawah (bawah tengah di ponsel). Wilayah
// live-region selalu dirender walau kosong, karena pembaca layar hanya
// mengumumkan isi yang ditambahkan ke wilayah yang sudah ada.
export function ToastHost() {
  const toasts = useSyncExternalStore(subscribeToasts, currentToasts)

  return createPortal(
    <div className="sid-toast-region" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body,
  )
}

function ToastItem({ toast }) {
  const [paused, setPaused] = useState(false)
  const remaining = useRef(toast.duration)

  useEffect(() => {
    if (paused) return undefined

    const startedAt = Date.now()
    const timer = window.setTimeout(() => dismissToast(toast.id), remaining.current)

    return () => {
      window.clearTimeout(timer)
      remaining.current -= Date.now() - startedAt
    }
  }, [paused, toast.id])

  const Icon = ICONS[toast.tone] ?? Info

  return (
    <div
      className={`sid-toast sid-toast--${toast.tone}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon size={18} className="sid-toast-icon" aria-hidden="true" />
      <p>{toast.message}</p>
      <button
        type="button"
        className="sid-toast-close"
        aria-label="Tutup notifikasi"
        onClick={() => dismissToast(toast.id)}
      >
        <X size={16} />
      </button>
    </div>
  )
}
