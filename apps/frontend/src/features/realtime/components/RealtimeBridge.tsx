import { useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'

import { useAuth } from '@/features/auth/contexts/AuthContext'
import { queryKeys } from '@/shared/lib/queryKeys'
import {
  LETTER_SIGNAL_DEBOUNCE_MS,
  PUBLIC_ALERT_REFRESH_JITTER_MS,
  REALTIME_EVENTS,
  realtimeChannels,
} from '../constants'
import { onRealtimeReconnect, subscribeRealtime } from '../realtimeClient'

// Daftar surat, ringkasan, detail (semua di bawah ['surat']) dan grafik
// pengajuan per hari, digabung untuk sinyal yang berdekatan.
function createLetterRefresh(queryClient: QueryClient) {
  let timer: ReturnType<typeof setTimeout> | null = null

  const run = () => {
    if (timer) clearTimeout(timer)

    timer = setTimeout(() => {
      timer = null
      void queryClient.invalidateQueries({ queryKey: queryKeys.surat.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.letterStats })
    }, LETTER_SIGNAL_DEBOUNCE_MS)
  }

  const cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }

  return { run, cancel }
}

/**
 * Listener realtime terpusat, dipasang sekali di root (App.tsx). Event dari
 * Reverb hanya sinyal: di sini diterjemahkan menjadi invalidasi cache React
 * Query, lalu data diambil ulang lewat REST seperti biasa.
 *
 * - `disaster-alerts` (publik): selalu, termasuk pengunjung tanpa login.
 * - Channel akun: selama ada sesi login (akun aktif, tidak wajib ganti
 *   kata sandi; selain itu ditolak backend). Warga juga menerima perubahan
 *   suratnya dari sini.
 * - `letters.staff`: akun non-warga, perubahan surat di semua antrean.
 * Channel private ditinggalkan saat logout atau akun berganti.
 */
export function RealtimeBridge() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const eligible = Boolean(user?.is_active && !user.must_change_password)
  const userId = eligible ? (user?.id ?? null) : null
  const isOfficial = eligible && user?.role !== 'warga'
  const letterRefresh = useMemo(() => createLetterRefresh(queryClient), [queryClient])

  useEffect(() => () => letterRefresh.cancel(), [letterRefresh])

  useEffect(
    () =>
      onRealtimeReconnect(() => {
        void queryClient.invalidateQueries({ predicate: (query) => query.meta?.realtime === true })
      }),
    [queryClient],
  )

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>()

    const unsubscribe = subscribeRealtime(
      ['disaster-alerts'],
      { type: 'public', name: realtimeChannels.disasterAlerts },
      {
        [REALTIME_EVENTS.disasterAlertsChanged]: () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.disasterAlerts.staffAll })

          const timer = setTimeout(() => {
            timers.delete(timer)
            void queryClient.invalidateQueries({ queryKey: queryKeys.disasterAlerts.public })
          }, Math.random() * PUBLIC_ALERT_REFRESH_JITTER_MS)
          timers.add(timer)
        },
      },
    )

    return () => {
      unsubscribe()
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [queryClient])

  useEffect(() => {
    if (!userId) return undefined

    return subscribeRealtime(
      isOfficial ? ['notifications'] : ['notifications', 'letters'],
      { type: 'private', name: realtimeChannels.user(userId) },
      {
        [REALTIME_EVENTS.notificationCreated]: () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
        },
        [REALTIME_EVENTS.letterChanged]: letterRefresh.run,
      },
    )
  }, [queryClient, userId, isOfficial, letterRefresh])

  useEffect(() => {
    if (!userId || !isOfficial) return undefined

    return subscribeRealtime(
      ['letters'],
      { type: 'private', name: realtimeChannels.lettersStaff },
      { [REALTIME_EVENTS.letterChanged]: letterRefresh.run },
    )
  }, [userId, isOfficial, letterRefresh])

  return null
}
