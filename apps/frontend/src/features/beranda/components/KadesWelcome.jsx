import { useState } from 'react'
import { UserRound } from 'lucide-react'

import { formatVillageName } from '@/shared/lib/villageName'

// Sambutan Kepala Desa. Teksnya diisi Petugas Desa (village.welcome_message,
// Kelola Profil Desa); bila kosong, seluruh blok tidak dirender.
// Nama dan foto dari pejabat Kepala Desa aktif (`head`, village_head di
// /public/home), dengan cadangan nama dari village.head_name. Jabatan
// memakai nama desa. Link Sejarah/Perangkat/Peta dari mockup sengaja tidak
// dipasang (01, P9).
//
// Tampilan: panel biru malam bermotif kontur; foto dalam bingkai gapura
// (seperti foto hero) menembus tepi atas panel. Jarak atas sengaja lebih
// rapat dari sectionGap karena sambutan langsung menyambung hero; nilainya
// = bagian foto yang menonjol + ±24px.
export function KadesWelcome({ content, village, head }) {
  const labels = content.welcomeBlock
  const message = village?.welcome_message?.trim()
  const photoUrl = head?.photo_url
  // URL foto yang gagal dimuat; foto baru (URL lain) dicoba lagi.
  const [failedUrl, setFailedUrl] = useState(null)

  if (!message) return null

  const villageName = formatVillageName(village?.name)
  const headName = head?.name || village?.head_name
  const showPhoto = Boolean(photoUrl) && failedUrl !== photoUrl

  return (
    <section className="bd-container mt-18 min-[721px]:mt-20" aria-labelledby="bd-welcome-title">
      <div className="grid items-start gap-7 rounded-[28px] bg-pb-laut-deep bg-(image:--pb-contour-light) bg-size-[480px_180px] px-6 pt-9 pb-10 text-white min-[721px]:grid-cols-[minmax(0,1fr)_200px] min-[721px]:gap-14 min-[721px]:px-14 min-[721px]:py-14">
        {/* Foto naik keluar panel: ponsel 48px (pt-9 + 48), desktop 56px
            (py-14 + 56). Cincin putih + garis tipis sama dengan bingkai hero. */}
        <span className="-mt-21 flex aspect-5/6 w-30 items-center justify-center overflow-hidden rounded-t-full bg-pb-laut text-white/70 shadow-[0_0_0_6px_#fff,0_0_0_7px_var(--color-pb-line)] min-[721px]:col-start-2 min-[721px]:row-start-1 min-[721px]:-mt-28 min-[721px]:w-auto">
          {showPhoto ? (
            <img
              src={photoUrl}
              alt={headName ? `Foto ${headName}` : 'Foto Kepala Desa'}
              className="size-full object-cover"
              loading="lazy"
              decoding="async"
              onError={() => setFailedUrl(photoUrl)}
            />
          ) : (
            <UserRound size={56} strokeWidth={1.5} aria-hidden="true" />
          )}
        </span>

        <figure className="m-0 min-[721px]:col-start-1 min-[721px]:row-start-1">
          <h2 id="bd-welcome-title" className="mt-0 mb-5 text-[15px] font-bold text-pb-padi">
            {labels.label}
          </h2>
          <span
            className="block h-9 font-display text-[88px] leading-[0.8] font-bold text-pb-padi"
            aria-hidden="true"
          >
            “
          </span>
          <blockquote className="m-0">
            <p className="m-0 max-w-[38ch] font-display text-[clamp(22px,17px+1.3vw,34px)] leading-snug font-semibold tracking-[-0.015em] text-pretty whitespace-pre-line">
              {message}
            </p>
          </blockquote>
          <figcaption className="mt-8 flex flex-col border-l-[3px] border-pb-padi pl-4">
            {headName && <span className="text-lg font-bold">{headName}</span>}
            <span className="text-base text-white/70">
              {labels.rolePrefix} {villageName ?? 'Desa'}
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
