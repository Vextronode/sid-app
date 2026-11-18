import { useEffect, useState } from 'react'

import { getPublicDisasterAlerts } from '../api'
import type { PublicDisasterAlert } from '../api'
import { ALERT_REFRESH_MS, isAlertExpired, MAX_TIMEOUT_MS } from '../utils'

/**
 * Peringatan SIGAP yang sedang tampil, untuk bar merah di halaman publik.
 *
 * - Dimuat ulang tiap ALERT_REFRESH_MS selama tab terlihat, dan langsung
 *   saat tab kembali terlihat; berhenti saat tab tidak aktif.
 * - Peringatan disembunyikan tepat saat `expires_at` lewat, walau belum
 *   dimuat ulang.
 * - Gagal memuat (mis. jaringan putus) tidak menghapus peringatan terakhir:
 *   lebih baik peringatan tetap terlihat daripada hilang diam-diam.
 */
export function usePublicDisasterAlerts(refreshMs = ALERT_REFRESH_MS) {
  const [alerts, setAlerts] = useState<PublicDisasterAlert[]>([])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const latest = await getPublicDisasterAlerts()
        if (active) {
          setAlerts(latest)
          setNow(Date.now())
        }
      } catch {
        // Peringatan terakhir tetap ditampilkan; dicoba lagi di putaran berikutnya.
      }
    }

    const visible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden'

    void load()

    const interval = setInterval(() => {
      if (visible()) void load()
    }, refreshMs)

    const onVisibilityChange = () => {
      if (visible()) void load()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      active = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [refreshMs])

  const showing = alerts.filter((alert) => !isAlertExpired(alert, now))

  // Bangunkan render tepat saat peringatan berikutnya kedaluwarsa.
  const nextExpiry = Math.min(...showing.map((alert) => new Date(alert.expires_at).getTime()))

  useEffect(() => {
    if (!Number.isFinite(nextExpiry)) return undefined

    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.min(Math.max(nextExpiry - Date.now(), 0), MAX_TIMEOUT_MS),
    )

    return () => clearTimeout(timer)
  }, [nextExpiry])

  return showing
}
