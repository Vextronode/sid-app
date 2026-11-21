import { useSyncExternalStore } from 'react'

import { REALTIME_SAFETY_INTERVAL } from '../constants'
import { isRealtimeLive, subscribeRealtimeStatus } from '../realtimeClient'
import type { RealtimeScope } from '../realtimeClient'

// true bila WebSocket tersambung dan channel cakupan ini sudah di-subscribe.
export function useRealtimeLive(scope: RealtimeScope): boolean {
  return useSyncExternalStore(
    subscribeRealtimeStatus,
    () => isRealtimeLive(scope),
    () => false,
  )
}

/**
 * Nilai `refetchInterval` React Query untuk data yang juga diperbarui lewat
 * realtime: polling biasa (`fallbackMs`) saat realtime mati, putus, atau
 * nonaktif; jaring pengaman jarang saat realtime hidup.
 */
export function useLiveRefetchInterval(scope: RealtimeScope, fallbackMs: number): number {
  return useRealtimeLive(scope) ? Math.max(REALTIME_SAFETY_INTERVAL, fallbackMs) : fallbackMs
}
