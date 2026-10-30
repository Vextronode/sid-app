import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { getNotificationTarget } from '@/features/notifikasi/utils/notificationTarget'

/**
 * Tujuan klik notifikasi push. Service worker tidak tahu peran pengguna,
 * jadi ia membuka halaman ini dan halaman inilah yang meneruskan ke
 * daftar surat sesuai peran.
 */
export default function NotificationRedirectPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  const target = getNotificationTarget(user?.role, {
    letter_id: searchParams.get('surat') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    is_applicant: searchParams.get('mine') === '1',
  })

  return <Navigate to={target ?? '/'} replace />
}
