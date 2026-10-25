import { useAuth } from '@/features/auth/contexts/AuthContext'
import DataWargaPage from './DataWargaPage'
import DataWargaReadOnlyPage from './DataWargaReadOnlyPage'

// Pengelola data penduduk & KK: Petugas Desa dan Kasi Pemerintahan
// (pemegang layanan kependudukan). Kaur TU & Umum hanya melihat.
const MANAGER_ROLES = ['staf_sid', 'kasi_pemerintahan']

export default function DataWargaAccessPage() {
  const { user } = useAuth()

  return MANAGER_ROLES.includes(user?.role) ? <DataWargaPage /> : <DataWargaReadOnlyPage />
}
