import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { HAL_AJUKAN_SURAT, HAL_STATUS_SURAT } from '@/lib/constants/routes'
import { useLoginAwareHref } from '../hooks/useLoginAwareHref'
import { buttonPrimary, textLink } from '../publicClasses'
import type { BerandaContent } from '../berandaContent'
import type { Village } from '@/types'

// Foto hero sebagai <img> (bukan background CSS) agar bisa diprioritaskan
// (fetchpriority="high") dan diketahui kapan selesai dimuat. Foto tersembunyi
// sampai termuat, lalu terbuka dari kaki ke atap gapura (pb-unveil); tanpa
// gerak bila prefers-reduced-motion. Gagal dimuat: tetap tersembunyi, yang
// tampil bingkai kontur (K2).
function HeroPhoto({ src }: { src: string }) {
  const [status, setStatus] = useState('loading') // loading | loaded | failed

  return (
    <img
      src={src}
      alt=""
      fetchPriority="high"
      decoding="async"
      onLoad={() => setStatus('loaded')}
      onError={() => setStatus('failed')}
      className={`absolute inset-0 size-full object-cover ${status === 'loaded' ? 'motion-safe:animate-pb-unveil' : 'invisible'}`}
    />
  )
}

// Hero (A12, A13): teks di kiri, foto desa dalam bingkai gapura di kanan
// (di ponsel: di bawah teks). Foto dan kreditnya dari data desa (diatur Petugas
// Desa); URL-nya juga dipasang sebagai variabel --bd-hero-image di <section>.
// Bila foto kosong atau gagal dimuat, bingkai tampil biru malam bermotif
// kontur (K2). Foto dekoratif, jadi alt="".
type BerandaHeroProps = { content: BerandaContent; village: Village | null }

export function BerandaHero({ content, village }: BerandaHeroProps) {
  const { hero } = content
  const imageUrl = village?.hero_image_url
  const photoCredit = village?.hero_photo_credit
  const ajukanHref = useLoginAwareHref(HAL_AJUKAN_SURAT)
  const statusHref = useLoginAwareHref(HAL_STATUS_SURAT)

  return (
    <section
      className="bd-hero relative overflow-hidden bg-pb-paper bg-(image:--pb-contour-dark) bg-position-[left_40px]"
      style={imageUrl ? { '--bd-hero-image': `url("${imageUrl}")` } : undefined}
    >
      <div className="bd-container grid items-center gap-x-16 gap-y-12 pt-12 pb-16 min-[901px]:grid-cols-[minmax(0,1fr)_min(440px,38%)] min-[901px]:pt-14 min-[901px]:pb-20">
        <div className="flex flex-col items-start">
          <span className="bd-rise mb-5 inline-flex items-center gap-2.5 text-base font-bold text-pb-laut before:h-0.75 before:w-7 before:rounded-full before:bg-pb-padi before:content-['']">
            {hero.greeting}
          </span>
          <h1 className="bd-rise-2 m-0 font-display text-[clamp(40px,22px+4.2vw,76px)] leading-[0.98] font-bold tracking-[-0.035em] text-balance text-pb-laut-deep">
            {hero.title}
          </h1>
          <p className="bd-rise-3 mt-6 mb-0 max-w-[52ch] text-[clamp(18px,16px+0.4vw,20px)] leading-relaxed text-pb-muted">
            {hero.lead}
          </p>
          <div className="bd-rise-3 mt-9 flex w-full flex-col gap-x-7 gap-y-3 sm:w-auto sm:flex-row sm:items-center">
            <Link to={ajukanHref} className={`bd-lift ${buttonPrimary}`}>
              {hero.primaryCta}
              <ArrowRight size={20} strokeWidth={2.2} aria-hidden="true" />
            </Link>
            <Link to={statusHref} className={`bd-lift self-center sm:self-auto ${textLink}`}>
              {hero.secondaryCta}
            </Link>
          </div>
        </div>

        {/* Bingkai gapura: atap setengah lingkaran (rounded-t-full), kaki siku.
            Cincin putih + garis tipis memisahkannya dari pola kontur. Bingkai
            bermotif kontur langsung tampil; fotonya menyusul. */}
        <div className="relative">
          <div
            className="relative aspect-4/3 overflow-hidden rounded-t-full bg-pb-laut-deep bg-(image:--pb-contour-light) bg-size-[480px_180px] shadow-[0_0_0_8px_#fff,0_0_0_9px_var(--color-pb-line)] min-[901px]:aspect-11/14 min-[901px]:shadow-[0_0_0_10px_#fff,0_0_0_11px_var(--color-pb-line)]"
            aria-hidden="true"
          >
            {/* key: foto baru (mis. diganti Staf SIDUTama) mulai lagi dari tersembunyi. */}
            {imageUrl && <HeroPhoto key={imageUrl} src={imageUrl} />}
          </div>
          {photoCredit && (
            <p className="absolute right-4 bottom-4 m-0 rounded-sm bg-pb-laut-deep/75 px-2.5 py-1 text-[13px] leading-snug text-white">
              {hero.creditPrefix} {photoCredit}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
