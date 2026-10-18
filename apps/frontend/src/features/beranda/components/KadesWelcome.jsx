import { UserRound } from 'lucide-react'

import { formatVillageName } from '@/shared/lib/villageName'
import { sectionGap } from '../publicClasses'

// Sambutan Kepala Desa. Teksnya diisi Petugas Desa (village.welcome_message,
// Kelola Profil Desa); bila kosong, seluruh blok tidak dirender.
// Nama dari village.head_name, jabatan dari nama desa.
// Link Sejarah/Perangkat/Peta dari mockup sengaja tidak dipasang (01, P9).
export function KadesWelcome({ content, village }) {
  const labels = content.welcomeBlock
  const message = village?.welcome_message?.trim()
  if (!message) return null

  const villageName = formatVillageName(village?.name)

  return (
    <section className={`bd-container ${sectionGap}`} aria-labelledby="bd-welcome-title">
      <div className="grid items-center gap-7 min-[721px]:grid-cols-[220px_minmax(0,1fr)] min-[721px]:gap-14">
        {/* Placeholder foto Kepala Desa (K2), berbingkai gapura seperti foto
            hero; dekoratif sampai foto asli tersedia. */}
        <span
          className="flex aspect-5/6 w-37.5 items-center justify-center rounded-t-full bg-pb-laut-tint bg-(image:--pb-contour-dark) text-pb-laut min-[721px]:w-auto"
          aria-hidden="true"
        >
          <UserRound size={56} strokeWidth={1.5} />
        </span>

        <figure className="m-0">
          <h2 id="bd-welcome-title" className="mt-0 mb-3.5 text-[15px] font-bold text-pb-laut">
            {labels.label}
          </h2>
          <blockquote className="m-0">
            <p className="m-0 max-w-[34ch] font-display text-[clamp(24px,18px+1.4vw,36px)] leading-tight font-semibold tracking-[-0.02em] text-pretty whitespace-pre-line text-pb-laut-deep">
              “{message}”
            </p>
          </blockquote>
          <figcaption className="mt-5.5 flex flex-col border-l-[3px] border-pb-padi pl-4">
            {village?.head_name && <span className="font-bold">{village.head_name}</span>}
            <span className="text-base text-pb-muted">
              {labels.rolePrefix} {villageName ?? 'Desa'}
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
