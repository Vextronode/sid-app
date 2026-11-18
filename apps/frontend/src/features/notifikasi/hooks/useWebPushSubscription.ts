import { useCallback, useEffect, useState } from 'react'
import { removePushSubscription, savePushSubscription } from '../api'
import { getApiErrorMessage, userFacingError } from '@/shared/lib/apiError'
import { notifyError, notifySuccess } from '@/shared/lib/toast'

// Batas tunggu service worker siap saat tombol ditekan. Tanpa service worker
// (mis. `npm run dev` tanpa PWA dev mode, atau pendaftarannya gagal),
// navigator.serviceWorker.ready tidak pernah selesai dan tombol tertahan di
// "Menyimpan...". Izin notifikasi tidak ikut dibatasi karena menunggu
// pengguna menjawab prompt browser.
export const SERVICE_WORKER_TIMEOUT_MS = 10_000

const SERVICE_WORKER_NOT_READY =
  'Layanan notifikasi browser belum siap. Muat ulang halaman lalu coba lagi.'

function decodeApplicationServerKey(key: string) {
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

// navigator.serviceWorker.ready dengan batas waktu: gagal dengan pesan yang
// bisa ditampilkan ke pengguna bila service worker tidak kunjung aktif.
function serviceWorkerReady(): Promise<ServiceWorkerRegistration> {
  let timer: number | undefined

  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(
      () => reject(userFacingError(SERVICE_WORKER_NOT_READY)),
      SERVICE_WORKER_TIMEOUT_MS,
    )
  })

  return Promise.race([navigator.serviceWorker.ready, timeout]).finally(() =>
    window.clearTimeout(timer),
  )
}

export default function useWebPushSubscription() {
  const supported = getPushEnvironment()
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Pesan gagal tampil di popover sekaligus sebagai toast merah.
  const fail = useCallback((message: string) => {
    setError(message)
    notifyError(message)

    return false
  }, [])

  // Pemeriksaan status awal sengaja tanpa batas waktu dan tanpa toast: bila
  // service worker belum ada, tombol cukup tetap "Aktifkan push".
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
          setError(
            getApiErrorMessage(requestError, 'Status notifikasi push tidak dapat diperiksa.'),
          )
        }
      })

    return () => {
      active = false
    }
  }, [supported])

  const enable = useCallback(async () => {
    if (!supported) return fail('Browser ini belum mendukung notifikasi push.')

    const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!publicKey) return fail('Notifikasi push belum dikonfigurasi. Hubungi administrator.')

    setLoading(true)
    setError('')

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw userFacingError(
          permission === 'denied'
            ? 'Izin notifikasi diblokir di browser. Ubah izin situs untuk mengaktifkannya.'
            : 'Izin notifikasi belum diberikan.',
        )
      }

      const registration = await serviceWorkerReady()
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeApplicationServerKey(publicKey),
        }))

      await savePushSubscription(subscription.toJSON())
      setSubscribed(true)
      notifySuccess('Notifikasi browser diaktifkan.')
      return true
    } catch (requestError) {
      return fail(getApiErrorMessage(requestError, 'Gagal mengaktifkan notifikasi push.'))
    } finally {
      setLoading(false)
    }
  }, [supported, fail])

  const disable = useCallback(async () => {
    if (!supported) return false

    setLoading(true)
    setError('')

    try {
      const registration = await serviceWorkerReady()
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await removePushSubscription(subscription.endpoint)
        await subscription.unsubscribe()
      }

      setSubscribed(false)
      notifySuccess('Notifikasi browser dinonaktifkan.')
      return true
    } catch (requestError) {
      return fail(getApiErrorMessage(requestError, 'Gagal menonaktifkan notifikasi push.'))
    } finally {
      setLoading(false)
    }
  }, [supported, fail])

  return { supported, subscribed, loading, error, enable, disable }
}
