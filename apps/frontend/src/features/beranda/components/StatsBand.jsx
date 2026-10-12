import { Link } from 'react-router-dom'

import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'
import { HAL_PROFIL } from '@/lib/constants/routes'
import { sectionGap } from '../publicClasses'

// Nol atau kosong dianggap belum ada datanya.
const formatNumber = (value) =>
  value ? Number(value).toLocaleString('id-ID', { maximumFractionDigits: 3 }) : null

// Pita angka (A19). Penduduk dan dusun dihitung backend dari data warga dan
// wilayah; luas wilayah diisi Petugas Desa di Kelola Profil Desa. Angka yang
// belum ada datanya tidak ditampilkan, dan pita disembunyikan bila semuanya
// kosong. Angka bukan link.
// Tampil sebagai panel biru laut bermotif kontur, sebentuk dengan panel
// layanan. Desktop: kolom sama lebar berpemisah garis tipis. Ponsel: satu
// angka per baris (angka dan label berdampingan) agar angka panjang seperti
// luas wilayah tidak terpotong.
const stat =
  'flex items-baseline gap-3 border-white/15 px-6 py-5 not-first:border-t sm:min-w-0 sm:flex-1 sm:flex-col sm:items-start sm:gap-1.5 sm:px-8 sm:py-9 sm:not-first:border-t-0 sm:not-first:border-l'

export function StatsBand({ content }) {
  const { statsBand: labels } = content
  const { village, stats } = usePublicVillageInfo()
  const area = formatNumber(village?.area_ha)

  const items = [
    { label: labels.population, value: formatNumber(stats?.total_population) },
    { label: labels.area, value: area && `${area} ha` },
    { label: labels.hamlets, value: formatNumber(stats?.total_hamlets) },
  ].filter((item) => item.value)

  if (items.length === 0) return null

  return (
    <section className={`bd-container ${sectionGap}`} aria-label={labels.label}>
      <div className="flex flex-col overflow-hidden rounded-3xl bg-pb-laut bg-(image:--pb-contour-light) bg-size-[480px_180px] text-white shadow-[0_30px_60px_-40px_rgba(12,35,65,0.6)] [--pb-focus:#fff] sm:flex-row">
        {items.map((item) => (
          <div key={item.label} className={stat}>
            <span className="font-display text-[clamp(30px,22px+1.6vw,46px)] leading-none font-bold tracking-[-0.03em] tabular-nums lg:whitespace-nowrap">
              {item.value}
            </span>
            <span className="text-base text-[#cfdbea]">{item.label}</span>
          </div>
        ))}
        <div className="flex items-end border-t border-white/15 px-6 py-4 sm:flex-none sm:border-t-0 sm:border-l sm:px-8 sm:py-9">
          <Link
            to={HAL_PROFIL}
            className="inline-flex min-h-11 items-center text-base font-bold text-white underline decoration-pb-padi decoration-2 underline-offset-[6px] transition-colors hover:text-pb-padi-soft"
          >
            {labels.profileLink}
          </Link>
        </div>
      </div>
    </section>
  )
}
