import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/queryKeys'
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../api'

const EMPTY_NOTIFICATIONS = []
const UNREAD_REFRESH_INTERVAL = 30 * 1000

function requestMessage(requestError, fallback) {
  return requestError?.response?.data?.message ?? fallback
}

// Data notifikasi disimpan di cache React Query sehingga dipakai bersama
// oleh semua layout: pindah halaman tidak memicu request ulang, dan hanya
// ada satu polling jumlah belum dibaca.
export default function useNotifications() {
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState('')
  const [markingIds, setMarkingIds] = useState([])
  const [markingAll, setMarkingAll] = useState(false)

  const listQuery = useQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: async () => {
      const response = await getNotifications()
      const data = response.data?.data

      if (!Array.isArray(data)) {
        throw new Error('Respons daftar notifikasi tidak valid.')
      }

      return data
    },
    staleTime: UNREAD_REFRESH_INTERVAL,
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
    refetchInterval: UNREAD_REFRESH_INTERVAL,
    refetchIntervalInBackground: false,
  })

  const notifications = listQuery.data ?? EMPTY_NOTIFICATIONS
  const unreadCount = countQuery.data ?? 0

  const refreshUnreadCount = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount }),
    [queryClient],
  )

  const setNotifications = useCallback(
    (update) =>
      queryClient.setQueryData(queryKeys.notifications.list, (current) =>
        update(current ?? EMPTY_NOTIFICATIONS),
      ),
    [queryClient],
  )

  const { refetch: refetchList } = listQuery
  const { refetch: refetchCount } = countQuery

  const reload = useCallback(async () => {
    setActionError('')
    const [list, count] = await Promise.all([refetchList(), refetchCount()])

    return !list.isError && !count.isError
  }, [refetchList, refetchCount])

  const markAsRead = useCallback(
    async (id) => {
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
    markingIds,
    markingAll,
    markAsRead,
    markAllAsRead,
    reload,
  }
}
