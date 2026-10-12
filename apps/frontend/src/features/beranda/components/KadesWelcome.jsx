import { UserRound } from 'lucide-react'

import { sectionGap } from '../publicClasses'

// Sambutan Kepala Desa. Teks sambutan dan foto belum ada, jadi seluruh blok
// hanya dirender di development (K1). Nama asli dari village.head_name.
// Link Sejarah/Perangkat/Peta dari mockup sengaja tidak dipasang (01, P9).
export function KadesWelcome({ content, headName }) {
  const { welcome, welcomeBlock: labels } = content
  if (!welcome) return null

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
            <p className="m-0 max-w-[34ch] font-display text-[clamp(24px,18px+1.4vw,36px)] leading-tight font-semibold tracking-[-0.02em] text-pretty text-pb-laut-deep">
              “{welcome.quote}”
            </p>
          </blockquote>
          <figcaption className="mt-5.5 flex flex-col border-l-[3px] border-pb-padi pl-4">
            <span className="font-bold">{headName || welcome.fallbackName}</span>
            <span className="text-base text-pb-muted">{welcome.role}</span>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
