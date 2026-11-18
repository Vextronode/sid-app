import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { roleHomePath } from '@/features/auth/utils/letterLinks'
import { canOpenOperatorRoute } from '@/features/operator-desa/constants/roleNavigation'

export const DATA_CPMI_ROUTE = '/admin/data-cpmi'

/**
 * Petugas F11 ditentukan jenis layanan (bukan peran tetap): Kasi/Kaur yang
 * bukan petugasnya dikembalikan ke halaman awalnya, sama seperti menunya
 * yang tidak tampil.
 */
export function MigrantWorkerAccessGate({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  if (!canOpenOperatorRoute(user, DATA_CPMI_ROUTE)) {
    return <Navigate to={roleHomePath(user?.role)} replace />
  }

  return children
}
