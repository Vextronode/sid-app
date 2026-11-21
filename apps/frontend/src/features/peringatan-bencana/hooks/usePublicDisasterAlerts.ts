import { useQuery } from '@tanstack/react-query'

import { REALTIME_QUERY_META } from '@/features/realtime/constants'
import { useLiveRefetchInterval } from '@/features/realtime/hooks/useLiveRefetchInterval'
import { queryKeys } from '@/shared/lib/queryKeys'
import { getPublicDisasterAlerts } from '../api'
import type { PublicDisasterAlert } from '../api'
import { ALERT_REFRESH_MS } from '../utils'
import { useUnexpiredAlerts } from './useUnexpiredAlerts'

const EMPTY_ALERTS: PublicDisasterAlert[] = []

/**
 * Peringatan SIGAP yang sedang tampil, untuk bar merah di halaman publik.
 *
 * - Realtime: sinyal `disaster-alerts.changed` (RealtimeBridge) membuat
 *   data diambil ulang segera. Saat WebSocket mati atau putus, dimuat ulang
 *   tiap ALERT_REFRESH_MS selama tab terlihat (berhenti saat tab tidak
 *   aktif), dan langsung saat tab kembali terlihat.
 * - Peringatan disembunyikan tepat saat `expires_at` lewat, walau belum
 *   dimuat ulang.
 * - Gagal memuat (mis. jaringan putus) tidak menghapus peringatan terakhir:
 *   lebih baik peringatan tetap terlihat daripada hilang diam-diam (React
 *   Query menyimpan data terakhir saat galat).
 */
export function usePublicDisasterAlerts(refreshMs = ALERT_REFRESH_MS) {
  const refetchInterval = useLiveRefetchInterval('disaster-alerts', refreshMs)

  const { data = EMPTY_ALERTS, dataUpdatedAt } = useQuery({
    queryKey: queryKeys.disasterAlerts.public,
    queryFn: getPublicDisasterAlerts,
    staleTime: 0,
    refetchInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    meta: REALTIME_QUERY_META,
  })

  return useUnexpiredAlerts(data, dataUpdatedAt)
}
