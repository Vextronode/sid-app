import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { roleHomePath } from '@/features/auth/utils/letterLinks'
import { canOpenOperatorRoute } from '@/features/operator-desa/constants/roleNavigation'

export const DATA_USAHA_ROUTE = '/admin/data-usaha'

/**
 * Petugas SKU ditentukan jenis surat (bukan peran tetap): Kasi/Kaur yang
 * bukan petugas SKU dikembalikan ke halaman awalnya, sama seperti menunya
 * yang tidak tampil.
 */
export function CitizenBusinessAccessGate({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  if (!canOpenOperatorRoute(user, DATA_USAHA_ROUTE)) {
    return <Navigate to={roleHomePath(user?.role)} replace />
  }

  return children
}
