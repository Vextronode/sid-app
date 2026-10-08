import { useCallback, useEffect, useState } from 'react'
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../api'

export default function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [markingIds, setMarkingIds] = useState([])
  const [markingAll, setMarkingAll] = useState(false)

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await getUnreadNotificationCount()
      const count = response.data?.count

      if (!Number.isInteger(count)) {
        throw new Error('Respons unread count tidak valid.')
      }

      setUnreadCount(count)
      return true
    } catch (requestError) {
      console.error('GET UNREAD NOTIFICATION COUNT ERROR:', requestError.response?.data ?? requestError)
      setError(requestError.response?.data?.message ?? 'Gagal memuat jumlah notifikasi belum dibaca.')
      return false
    }
  }, [])

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await getNotifications()
      const data = response.data?.data

      if (!Array.isArray(data)) {
        throw new Error('Respons daftar notifikasi tidak valid.')
      }

      setNotifications(data)
      await loadUnreadCount()
      return true
    } catch (requestError) {
      console.error('GET NOTIFICATIONS ERROR:', requestError.response?.data ?? requestError)
      setError(requestError.response?.data?.message ?? 'Gagal memuat notifikasi.')
      return false
    } finally {
      setLoading(false)
    }
  }, [loadUnreadCount])

  useEffect(() => {
    void Promise.resolve().then(loadNotifications)

    const interval = window.setInterval(() => {
      void loadUnreadCount()
    }, 30000)

    return () => window.clearInterval(interval)
  }, [loadNotifications, loadUnreadCount])

  const markAsRead = useCallback(
    async (id) => {
      const notification = notifications.find((item) => item.id === id)
      if (!notification || notification.read || markingIds.includes(id)) return false

      setError('')
      setMarkingIds((current) => [...current, id])

      try {
        await markNotificationAsRead(id)
        setNotifications((current) =>
          current.map((item) => (item.id === id ? { ...item, read: true } : item)),
        )
        await loadUnreadCount()
        return true
      } catch (requestError) {
        console.error('MARK NOTIFICATION AS READ ERROR:', requestError.response?.data ?? requestError)
        setError(requestError.response?.data?.message ?? 'Gagal menandai notifikasi sebagai dibaca.')
        return false
      } finally {
        setMarkingIds((current) => current.filter((itemId) => itemId !== id))
      }
    },
    [loadUnreadCount, markingIds, notifications],
  )

  const markAllAsRead = useCallback(async () => {
    if (markingAll || unreadCount === 0) return false

    setError('')
    setMarkingAll(true)

    try {
      await markAllNotificationsAsRead()
      setNotifications((current) => current.map((item) => ({ ...item, read: true })))
      await loadUnreadCount()
      return true
    } catch (requestError) {
      console.error('MARK ALL NOTIFICATIONS AS READ ERROR:', requestError.response?.data ?? requestError)
      setError(requestError.response?.data?.message ?? 'Gagal menandai semua notifikasi sebagai dibaca.')
      return false
    } finally {
      setMarkingAll(false)
    }
  }, [loadUnreadCount, markingAll, unreadCount])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markingIds,
    markingAll,
    markAsRead,
    markAllAsRead,
    reload: loadNotifications,
  }
}