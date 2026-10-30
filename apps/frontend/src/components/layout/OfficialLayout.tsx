import type { ReactNode } from 'react'

import { useAuth } from '@/features/auth/contexts/AuthContext'
import type { UserRole } from '@/types'
import { AdminLayout } from './AdminLayout'
import { OperatorDesaLayout } from './OperatorDesaLayout'

const OPERATOR_ROLES: UserRole[] = ['kasi_pemerintahan', 'kaur_tu_umum', 'staf_sid']

/**
 * Tata letak untuk halaman yang dipakai semua pejabat (mis. profil):
 * sidebar operator untuk Kasi/Kaur/Staf SIDUTama, bilah atas untuk
 * RT/RW/Kadus/Kades/Sekdes.
 */
export function OfficialLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  return OPERATOR_ROLES.includes(user?.role) ? (
    <OperatorDesaLayout>{children}</OperatorDesaLayout>
  ) : (
    <AdminLayout>{children}</AdminLayout>
  )
}
