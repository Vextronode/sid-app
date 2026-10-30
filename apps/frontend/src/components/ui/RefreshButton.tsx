import { RefreshCw } from 'lucide-react'
import { useState } from 'react'

/**
 * Tombol muat ulang data halaman, dipakai seragam di header halaman
 * daftar dashboard. Ikon berputar dan tombol nonaktif selama `onRefresh`
 * (boleh mengembalikan Promise) berjalan, atau selama `refreshing` true
 * (mis. isFetching dari React Query).
 */
export function RefreshButton({ onRefresh, refreshing = false, disabled = false }) {
  const [pending, setPending] = useState(false)
  const busy = pending || refreshing

  const handleClick = async () => {
    setPending(true)

    try {
      await onRefresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      className="sid-wilayah-btn sid-wilayah-btn-secondary"
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      <RefreshCw
        size={15}
        aria-hidden="true"
        className={busy ? 'sid-refresh-icon-spinning' : undefined}
      />
      Refresh
    </button>
  )
}
