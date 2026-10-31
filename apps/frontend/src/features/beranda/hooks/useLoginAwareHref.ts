import { useAuth } from '@/features/auth/contexts/AuthContext'
import { letterTargetForRole } from '@/features/auth/utils/letterLinks'
import { buildLoginPath } from '@/features/auth/utils/loginRedirect'

// Tujuan link yang butuh login (A12–A15, A25; K4). `target` ditulis sebagai
// halaman warga.
// Sudah login → tujuan untuk perannya (pejabat ke Surat Saya pejabat, dst.).
// Belum → halaman login yang membawa ?redirect=<tujuan>, sehingga pengguna
// kembali ke halaman itu (atau padanannya) setelah berhasil masuk.
export function useLoginAwareHref(target: string) {
  const { user } = useAuth()

  return user ? letterTargetForRole(target, user.role) : buildLoginPath(target)
}
