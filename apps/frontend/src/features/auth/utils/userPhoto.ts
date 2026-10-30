// Foto profil akun yang sedang login. Akun warga memakai foto akunnya
// sendiri; akun yang menjabat memakai foto jabatan (official.photo_img) yang
// dikelola Staf SIDUTama. null berarti belum ada foto (pakai avatar default).
import type { User } from '@/types'

export function userPhotoUrl(user: User | null | undefined): string | null {
  if (!user) return null

  return user.role === 'warga' ? (user.photo_url ?? null) : (user.official?.photo_img ?? null)
}
