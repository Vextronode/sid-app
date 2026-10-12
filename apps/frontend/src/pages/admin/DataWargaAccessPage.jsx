import { useAuth } from '@/features/auth/contexts/AuthContext'
import DataWargaPage from './DataWargaPage'
import DataWargaReadOnlyPage from './DataWargaReadOnlyPage'

/**
 * Petugas Desa mengelola data warga; Kasi/Kaur hanya dapat melihatnya.
 */
export default function DataWargaAccessPage() {
  const { user } = useAuth()

  return user?.role === 'petugas_desa' ? <DataWargaPage /> : <DataWargaReadOnlyPage />
}
