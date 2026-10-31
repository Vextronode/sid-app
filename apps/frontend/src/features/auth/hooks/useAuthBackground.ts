import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'

// Latar halaman Masuk dan Daftar memakai foto hero beranda (diatur Staf
// aplikasi di Kelola Profil Desa > Tampilan Publik). Datanya dari identitas
// desa yang sudah dibagikan dan di-cache usePublicVillageInfo, jadi begitu
// foto hero diganti, latar kedua halaman ikut berganti. Tanpa foto, latar
// polos seperti sebelumnya.
export function useAuthBackground() {
  const { village } = usePublicVillageInfo()
  const imageUrl = village?.hero_image_url

  if (!imageUrl) return { className: 'sid-login', style: undefined }

  return {
    className: 'sid-login sid-login--photo',
    style: { '--sid-login-bg': `url("${imageUrl}")` },
  }
}
