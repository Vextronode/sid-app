import type { ReactNode } from 'react'

import { OperatorDesaLayout } from './OperatorDesaLayout'

/**
 * Tata letak semua halaman pejabat (RT, RW, Kadus, Kades, Sekdes, Kasi,
 * Kaur, Staf SIDUTama): sidebar operator dengan menu sesuai peran
 * (roleNavigation.ts).
 */
export function OfficialLayout({ children }: { children: ReactNode }) {
  return <OperatorDesaLayout>{children}</OperatorDesaLayout>
}
