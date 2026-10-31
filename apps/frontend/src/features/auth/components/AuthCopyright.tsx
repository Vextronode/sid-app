import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'
import { formatVillageName } from '@/shared/lib/villageName'

// Baris hak cipta di kaki kartu halaman auth. Nama dan wilayah desa dari
// data desa (Kelola Profil Desa); selagi belum termuat, hanya tahun.
export function AuthCopyright() {
  const { village } = usePublicVillageInfo()

  const text = [
    formatVillageName(village?.name),
    village?.district && `Kec. ${village.district}`,
    village?.regency && `Kab. ${village.regency}`,
    `© ${new Date().getFullYear()}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return <p className="sid-login-copyright">{text}</p>
}
