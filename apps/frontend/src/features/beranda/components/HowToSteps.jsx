import { Link } from 'react-router-dom'

import { HAL_AJUKAN_SURAT } from '@/lib/constants/routes'
import { useLoginAwareHref } from '../hooks/useLoginAwareHref'

// Cara mengajukan surat (A25). Copy langkah dari berandaContent.js (K10).
// Langkah terakhir memakai warna aksen; tombol memakai alur login yang sama
// dengan "Ajukan Surat" di hero (K4).
export function HowToSteps({ content }) {
  const { howTo } = content
  const ajukanHref = useLoginAwareHref(HAL_AJUKAN_SURAT)
  const lastIndex = howTo.steps.length - 1

  return (
    <section className="bd-howto" aria-labelledby="bd-howto-title">
      <div className="bd-container bd-howto-inner">
        <div className="bd-section-head bd-howto-head">
          <div>
            <h2 id="bd-howto-title" className="bd-section-title">
              {howTo.title}
            </h2>
            <p className="bd-section-subtitle">{howTo.subtitle}</p>
          </div>
          <Link to={ajukanHref} className="bd-button bd-button--primary bd-button--section">
            {howTo.cta}
          </Link>
        </div>

        <ol className="bd-steps">
          {howTo.steps.map((step, index) => (
            <li
              key={step.title}
              className={`bd-step${index === lastIndex ? ' bd-step--accent' : ''}`}
            >
              <span className="bd-step-label">
                {howTo.stepLabel} {index + 1}
              </span>
              <h3 className="bd-step-title">{step.title}</h3>
              <p className="bd-step-desc">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
