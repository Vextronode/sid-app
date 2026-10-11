import { useAuth } from '@/features/auth/contexts/AuthContext'
import { buildLoginPath } from '@/features/auth/utils/loginRedirect'

// Tujuan link yang butuh login (A12–A15, A25; K4).
// Sudah login → langsung ke tujuan. Belum → halaman login yang membawa
// ?redirect=<tujuan>, sehingga warga kembali ke sana setelah berhasil masuk.
export function useLoginAwareHref(target) {
  const { user } = useAuth()

  return user ? target : buildLoginPath(target)
}
