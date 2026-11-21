import { useEffect, useMemo, useState } from 'react'

import type { PublicDisasterAlert } from '../api'
import { isAlertExpired, MAX_TIMEOUT_MS } from '../utils'

/**
 * Peringatan yang belum lewat `expires_at`. Peringatan disembunyikan tepat
 * saat masa tayangnya habis, tanpa menunggu data dimuat ulang (polling
 * jarang saat realtime hidup, dan backend juga menyaring yang kedaluwarsa).
 *
 * `dataUpdatedAt`: waktu data terakhir diterima (React Query), dipakai
 * sebagai "sekarang" sesudah setiap pemuatan.
 */
export function useUnexpiredAlerts<T extends Pick<PublicDisasterAlert, 'expires_at'>>(
  alerts: T[],
  dataUpdatedAt: number,
): T[] {
  const [tick, setTick] = useState(() => Date.now())
  const now = Math.max(tick, dataUpdatedAt)

  const showing = useMemo(
    () => alerts.filter((alert) => !isAlertExpired(alert, now)),
    [alerts, now],
  )

  // Bangunkan render tepat saat peringatan berikutnya kedaluwarsa.
  const nextExpiry = Math.min(...showing.map((alert) => new Date(alert.expires_at).getTime()))

  useEffect(() => {
    if (!Number.isFinite(nextExpiry)) return undefined

    const timer = setTimeout(
      () => setTick(Date.now()),
      Math.min(Math.max(nextExpiry - Date.now(), 0), MAX_TIMEOUT_MS),
    )

    return () => clearTimeout(timer)
  }, [nextExpiry])

  return showing
}
