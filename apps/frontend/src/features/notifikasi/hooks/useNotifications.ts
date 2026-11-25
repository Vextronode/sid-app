import { useCallback, useMemo, useState } from 'react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'

import { REALTIME_QUERY_META } from '@/features/realtime/constants'
import { useLiveRefetchInterval } from '@/features/realtime/hooks/useLiveRefetchInterval'
import { queryKeys } from '@/shared/lib/queryKeys'
import type { ApiError, AppNotification } from '@/types'
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../api'

const EMPTY_NOTIFICATIONS: AppNotification[] = []
const UNREAD_REFRESH_INTERVAL = 30 * 1000

// Satu halaman daftar notifikasi dari backend (20 per halaman).
type NotificationPage = { items: AppNotification[]; nextPage: number | null }

// Hasil hook, dipakai juga sebagai props popover notifikasi.
export type NotificationState = ReturnType<typeof useNotifications>

function requestMessage(requestError: unknown, fallback: string): string {
  return (requestError as ApiError)?.response?.data?.message ?? fallback
}

// Data notifikasi disimpan di cache React Query sehingga dipakai bersama
// oleh semua layout: pindah halaman tidak memicu request ulang, dan hanya
// ada satu polling jumlah belum dibaca.
//
// Daftar dimuat berhalaman (useInfiniteQuery): halaman pertama saat dibuka,
// berikutnya lewat loadMore(). Invalidasi memuat ulang halaman yang sudah
// terbuka.
//
// Realtime: notifikasi baru memicu invalidasi lewat RealtimeBridge
// (event notification.created). Selama WebSocket hidup polling dijarangkan
// menjadi jaring pengaman; saat putus kembali tiap 30 detik.
export default function useNotifications() {
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState('')
  const [markingIds, setMarkingIds] = useState<string[]>([])
  const [markingAll, setMarkingAll] = useState(false)
  const unreadRefreshInterval = useLiveRefetchInterval('notifications', UNREAD_REFRESH_INTERVAL)

  const listQuery = useInfiniteQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: async ({ pageParam }): Promise<NotificationPage> => {
      const response = await getNotifications(pageParam)
      const data = response.data?.data
      const meta = response.data?.meta

      if (!Array.isArray(data)) {
        throw new Error('Respons daftar notifikasi tidak valid.')
      }

      return {
        items: data,
        nextPage: meta && meta.current_page < meta.last_page ? meta.current_page + 1 : null,
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    staleTime: UNREAD_REFRESH_INTERVAL,
    meta: REALTIME_QUERY_META,
  })

  const countQuery = useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: async () => {
      const response = await getUnreadNotificationCount()
      const count = response.data?.data?.count

      if (!Number.isInteger(count)) {
        throw new Error('Respons unread count tidak valid.')
      }

      return count
    },
    staleTime: UNREAD_REFRESH_INTERVAL,
    refetchInterval: unreadRefreshInterval,
    refetchIntervalInBackground: false,
    meta: REALTIME_QUERY_META,
  })

  const notifications = useMemo(
    () => listQuery.data?.pages.flatMap((page) => page.items) ?? EMPTY_NOTIFICATIONS,
    [listQuery.data],
  )
  const unreadCount = countQuery.data ?? 0

  const refreshUnreadCount = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount }),
    [queryClient],
  )

  // Perubahan lokal diterapkan ke semua halaman yang sudah dimuat.
  const setNotifications = useCallback(
    (update: (current: AppNotification[]) => AppNotification[]) =>
      queryClient.setQueryData<InfiniteData<NotificationPage, number>>(
        queryKeys.notifications.list,
        (current) =>
          current && {
            ...current,
            pages: current.pages.map((page) => ({ ...page, items: update(page.items) })),
          },
      ),
    [queryClient],
  )

  const { refetch: refetchList, fetchNextPage } = listQuery
  const { refetch: refetchCount } = countQuery

  const reload = useCallback(async () => {
    setActionError('')
    const [list, count] = await Promise.all([refetchList(), refetchCount()])

    return !list.isError && !count.isError
  }, [refetchList, refetchCount])

  const loadMore = useCallback(async () => {
    setActionError('')
    await fetchNextPage()
  }, [fetchNextPage])

  const markAsRead = useCallback(
    async (id: string) => {
      const notification = notifications.find((item) => item.id === id)
      if (!notification || notification.read || markingIds.includes(id)) return false

      setActionError('')
      setMarkingIds((current) => [...current, id])

      try {
        await markNotificationAsRead(id)
        setNotifications((current) =>
          current.map((item) => (item.id === id ? { ...item, read: true } : item)),
        )
        await refreshUnreadCount()
        return true
      } catch (requestError) {
        setActionError(requestMessage(requestError, 'Gagal menandai notifikasi sebagai dibaca.'))
        return false
      } finally {
        setMarkingIds((current) => current.filter((itemId) => itemId !== id))
      }
    },
    [markingIds, notifications, refreshUnreadCount, setNotifications],
  )

  const markAllAsRead = useCallback(async () => {
    if (markingAll || unreadCount === 0) return false

    setActionError('')
    setMarkingAll(true)

    try {
      await markAllNotificationsAsRead()
      setNotifications((current) => current.map((item) => ({ ...item, read: true })))
      await refreshUnreadCount()
      return true
    } catch (requestError) {
      setActionError(
        requestMessage(requestError, 'Gagal menandai semua notifikasi sebagai dibaca.'),
      )
      return false
    } finally {
      setMarkingAll(false)
    }
  }, [markingAll, refreshUnreadCount, setNotifications, unreadCount])

  const error =
    actionError ||
    (listQuery.error ? requestMessage(listQuery.error, 'Gagal memuat notifikasi.') : '') ||
    (countQuery.error
      ? requestMessage(countQuery.error, 'Gagal memuat jumlah notifikasi belum dibaca.')
      : '')

  return {
    notifications,
    unreadCount,
    loading: listQuery.isPending,
    error,
    hasMore: listQuery.hasNextPage,
    loadingMore: listQuery.isFetchingNextPage,
    loadMore,
    markingIds,
    markingAll,
    markAsRead,
    markAllAsRead,
    reload,
  }
}
