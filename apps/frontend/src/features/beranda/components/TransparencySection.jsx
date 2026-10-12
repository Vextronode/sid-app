import { ExternalLink } from 'lucide-react'

import { SECTION_TRANSPARANSI } from '@/lib/constants/routes'
import { sectionGap, sectionTitle, textLink } from '../publicClasses'

// Link PDF (A26, A27): tab baru, dengan ikon sebagai petunjuk visual dan
// teks tersembunyi untuk pembaca layar.
function PdfLink({ href, label, hint }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={textLink}>
      {label} <span className="bd-visually-hidden">{hint}</span>
      <ExternalLink size={18} aria-hidden="true" />
    </a>
  )
}

// Angka tanpa kotak: garis tebal di atas tiap angka, seperti kolom laporan.
function Figure({ label, value, children }) {
  return (
    <div className="flex flex-col gap-2 border-t-2 border-pb-ink pt-4.5">
      <span className="text-[15px] text-pb-muted">{label}</span>
      <span className="font-display text-[clamp(24px,20px+1vw,32px)] leading-[1.15] font-bold tracking-[-0.02em] wrap-anywhere">
        {value}
      </span>
      {children}
    </div>
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
      className={`bd-container grid scroll-mt-22 gap-8 min-[901px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] min-[901px]:gap-12 ${sectionGap}`}
      aria-labelledby="bd-transparency-title"
    >
      <div>
        <span className="mb-3 inline-block text-[15px] font-bold text-pb-laut">{labels.label}</span>
        <h2 id="bd-transparency-title" className={sectionTitle}>
          {labels.titlePrefix} {apbdes.year}
        </h2>
        <p className="mt-3.5 mb-0 max-w-[44ch] text-pb-muted">{apbdes.description}</p>
        <div className="mt-5 flex flex-col items-start gap-1">
          <PdfLink
            href={apbdes.documentUrl}
            label={labels.documentLink}
            hint={labels.documentHint}
          />
          <PdfLink href={apbdes.archiveUrl} label={labels.archiveLink} hint={labels.archiveHint} />
        </div>
      </div>

      <div className="grid content-start gap-6 sm:grid-cols-3 sm:gap-x-7 sm:gap-y-0">
        <Figure label={labels.income} value={apbdes.income} />
        <Figure label={labels.spending} value={apbdes.spending} />
        <Figure label={labels.realization} value={apbdes.realizationLabel}>
          {/* Persentase sudah tertulis di atas; bilah hanya visual. */}
          <span
            className="mt-1.5 block h-2 overflow-hidden rounded-full bg-pb-line"
            aria-hidden="true"
          >
            <span className="block h-full bg-pb-padi" style={{ width: `${percent}%` }} />
          </span>
        </Figure>
        <p className="bd-meta col-span-full mt-6 mb-0 text-sm text-pb-muted">
          {labels.sourcePrefix} {apbdes.source} · {labels.updatedPrefix} {apbdes.updatedAt}
        </p>
      </div>
    </section>
  )
}
