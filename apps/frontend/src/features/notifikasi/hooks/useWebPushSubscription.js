import { useCallback, useEffect, useState } from 'react'
import { removePushSubscription, savePushSubscription } from '../api'

function decodeApplicationServerKey(key) {
  const padding = '='.repeat((4 - (key.length % 4)) % 4)
  const base64 = `${key}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)

  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

function getPushEnvironment() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

export default function useWebPushSubscription() {
  const supported = getPushEnvironment()
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supported) return

    let active = true
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (active) setSubscribed(Boolean(subscription))
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message || 'Status notifikasi push tidak dapat diperiksa.')
        }
      })

    return () => {
      active = false
    }
  }, [supported])

  const enable = useCallback(async () => {
    if (!supported) {
      setError('Browser ini belum mendukung notifikasi push.')
      return false
    }

    const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!publicKey) {
      setError('Notifikasi push belum dikonfigurasi. Hubungi administrator.')
      return false
    }

    setLoading(true)
    setError('')

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error(
          permission === 'denied'
            ? 'Izin notifikasi diblokir di browser. Ubah izin situs untuk mengaktifkannya.'
            : 'Izin notifikasi belum diberikan.',
        )
      }

      const registration = await navigator.serviceWorker.ready
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeApplicationServerKey(publicKey),
        }))

      await savePushSubscription(subscription.toJSON())
      setSubscribed(true)
      return true
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ??
          requestError.message ??
          'Gagal mengaktifkan notifikasi push.',
      )
      return false
    } finally {
      setLoading(false)
    }
  }, [supported])

  const disable = useCallback(async () => {
    if (!supported) return false

    setLoading(true)
    setError('')

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        setSubscribed(false)
        return true
      }

      await removePushSubscription(subscription.endpoint)
      await subscription.unsubscribe()
      setSubscribed(false)
      return true
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ??
          requestError.message ??
          'Gagal menonaktifkan notifikasi push.',
      )
      return false
    } finally {
      setLoading(false)
    }
  }, [supported])

  return { supported, subscribed, loading, error, enable, disable }
}
