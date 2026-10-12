import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { HAL_AJUKAN_SURAT, HAL_STATUS_SURAT } from '@/lib/constants/routes'
import { useLoginAwareHref } from '../hooks/useLoginAwareHref'
import { Wave } from './Wave'

// Hero (A12, A13). Foto dan kreditnya dari data desa (diatur Petugas Desa),
// lewat background-image di atas latar --bd-color-hero-fallback: bila foto
// kosong atau gagal dimuat, yang tampil hanya warna latar (K2). Foto
// dekoratif, jadi tidak ada alt/role="img".
export function BerandaHero({ content, village }) {
  const { hero } = content
  const imageUrl = village?.hero_image_url
  const photoCredit = village?.hero_photo_credit
  const ajukanHref = useLoginAwareHref(HAL_AJUKAN_SURAT)
  const statusHref = useLoginAwareHref(HAL_STATUS_SURAT)

  return (
    <section
      className="bd-hero"
      style={imageUrl ? { '--bd-hero-image': `url("${imageUrl}")` } : undefined}
    >
      <div className="bd-container bd-hero-inner">
        <span className="bd-hero-greeting bd-rise">{hero.greeting}</span>
        <h1 className="bd-hero-title bd-rise-2">{hero.title}</h1>
        <p className="bd-hero-lead bd-rise-3">{hero.lead}</p>
        <div className="bd-hero-actions bd-rise-3">
          <Link to={ajukanHref} className="bd-button bd-button--primary bd-lift">
            {hero.primaryCta}
            <ArrowRight size={20} strokeWidth={2.2} aria-hidden="true" />
          </Link>
          <Link to={statusHref} className="bd-button bd-button--light bd-lift">
            {hero.secondaryCta}
          </Link>
        </div>
      </div>

      {photoCredit && (
        <p className="bd-hero-credit">
          {hero.creditPrefix} {photoCredit}
        </p>
      )}

      <Wave variant="hero" />
    </section>
  )
}
