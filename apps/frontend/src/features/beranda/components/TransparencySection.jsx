import { ExternalLink } from 'lucide-react'

import { SECTION_TRANSPARANSI } from '@/lib/constants/routes'

// Link PDF (A26, A27): tab baru, dengan ikon sebagai petunjuk visual dan
// teks tersembunyi untuk pembaca layar.
function PdfLink({ href, label, hint }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="bd-transparency-link">
      {label} <span className="bd-visually-hidden">{hint}</span>
      <ExternalLink size={18} aria-hidden="true" />
    </a>
  )
}

// Transparansi APBDes (A26, A27; tujuan gulir A7). Belum ada data APBDes,
// jadi isinya dummy dan seluruh section hanya dirender di development (K1).
export function TransparencySection({ content }) {
  const { apbdes, transparency: labels } = content
  if (!apbdes) return null

  const percent = Math.min(100, Math.max(0, Number(apbdes.realizationPercent) || 0))

  return (
    <section
      id={SECTION_TRANSPARANSI}
      className="bd-container bd-transparency"
      aria-labelledby="bd-transparency-title"
    >
      <div className="bd-transparency-intro">
        <span className="bd-eyebrow">{labels.label}</span>
        <h2 id="bd-transparency-title" className="bd-section-title">
          {labels.titlePrefix} {apbdes.year}
        </h2>
        <p className="bd-transparency-desc">{apbdes.description}</p>
        <div className="bd-transparency-links">
          <PdfLink
            href={apbdes.documentUrl}
            label={labels.documentLink}
            hint={labels.documentHint}
          />
          <PdfLink href={apbdes.archiveUrl} label={labels.archiveLink} hint={labels.archiveHint} />
        </div>
      </div>

      <div className="bd-transparency-figures">
        <div className="bd-figure-card">
          <span className="bd-figure-label">{labels.income}</span>
          <span className="bd-figure-value">{apbdes.income}</span>
        </div>
        <div className="bd-figure-card">
          <span className="bd-figure-label">{labels.spending}</span>
          <span className="bd-figure-value">{apbdes.spending}</span>
        </div>
        <div className="bd-figure-card">
          <span className="bd-figure-label">{labels.realization}</span>
          <span className="bd-figure-value">{apbdes.realizationLabel}</span>
          {/* Persentase sudah tertulis di atas; bilah hanya visual. */}
          <span className="bd-progress" aria-hidden="true">
            <span className="bd-progress-fill" style={{ '--bd-progress': `${percent}%` }} />
          </span>
        </div>
        <p className="bd-transparency-source">
          {labels.sourcePrefix} {apbdes.source} · {labels.updatedPrefix} {apbdes.updatedAt}
        </p>
      </div>
    </section>
  )
}
