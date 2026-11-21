import type { StatusTone } from '@/components/ui/StatusPill'
import type { DisasterAlertLevel, PublicDisasterAlert } from './api'

// Pembaruan berkala bar peringatan dan tab Peringatan SIGAP saat realtime
// mati atau putus (saat hidup, data diperbarui lewat sinyal Reverb).
export const ALERT_REFRESH_MS = 60_000

// setTimeout tidak bisa menunggu lebih dari ~24,8 hari.
export const MAX_TIMEOUT_MS = 2_147_483_647

export function levelTone(level: DisasterAlertLevel): StatusTone {
  if (level === 'awas' || level === 'siaga') return 'danger'
  if (level === 'waspada') return 'warning'

  return 'inactive'
}

export function isAlertExpired(alert: Pick<PublicDisasterAlert, 'expires_at'>, now = Date.now()) {
  return new Date(alert.expires_at).getTime() <= now
}

// Waktu singkat, mis. "Senin, 16 Nov, 14.02".
export function formatAlertTime(value: string) {
  const date = new Date(value)
  const day = date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })
  const time = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  return `${day}, ${time}`
}

// Data kejadian untuk detail: "M5,2 · kedalaman 10 km · 23 km barat daya Cibenda".
export function alertFacts(alert: PublicDisasterAlert) {
  return [
    alert.magnitude !== null
      ? `M${alert.magnitude.toLocaleString('id-ID', { minimumFractionDigits: 1 })}`
      : null,
    alert.depth_km !== null ? `kedalaman ${alert.depth_km.toLocaleString('id-ID')} km` : null,
    alert.location,
  ].filter((fact): fact is string => Boolean(fact))
}
