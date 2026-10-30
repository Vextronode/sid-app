import { Link } from 'react-router-dom'

import { HAL_AJUKAN_SURAT } from '@/lib/constants/routes'
import { useLoginAwareHref } from '../hooks/useLoginAwareHref'
import { buttonPrimary, sectionGap, sectionSubtitle, sectionTitle } from '../publicClasses'
import type { BerandaContent } from '../berandaContent'

// Desktop: tiap langkah satu anak tangga lebih tinggi dari sebelumnya, seperti
// petak sawah berundak. Undakannya tetap 32px (grid rata atas, bukan ikut
// tinggi teks), dan garis tegak di tepi kiri tiap langkah turun tepat ke garis
// langkah sebelumnya sehingga tangganya tidak putus.
const RISE = ['min-[901px]:mt-24', 'min-[901px]:mt-16', 'min-[901px]:mt-8', 'min-[901px]:mt-0']

// Cara mengajukan surat (A25). Copy langkah dari berandaContent.ts (K10).
// Langkah terakhir memakai warna aksen; tombol memakai alur login yang sama
// dengan "Ajukan Surat" di hero (K4). Nomor besar hanya visual (aria-hidden);
// pembaca layar membaca label "Langkah N" yang disembunyikan secara visual.
export function HowToSteps({ content }: { content: BerandaContent }) {
  const { howTo } = content
  const ajukanHref = useLoginAwareHref(HAL_AJUKAN_SURAT)
  const lastIndex = howTo.steps.length - 1

  return (
    <section
      className={`border-y border-pb-line bg-white py-(--pb-section) ${sectionGap}`}
      aria-labelledby="bd-howto-title"
    >
      <div className="bd-container">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-x-8 gap-y-5 min-[901px]:mb-24">
          <div>
            <h2 id="bd-howto-title" className={sectionTitle}>
              {howTo.title}
            </h2>
            <p className={sectionSubtitle}>{howTo.subtitle}</p>
          </div>
          <Link to={ajukanHref} className={buttonPrimary}>
            {howTo.cta}
          </Link>
        </div>

        <ol className="m-0 grid list-none grid-cols-1 items-start p-0 min-[901px]:grid-cols-4">
          {howTo.steps.map((step, index) => {
            const isLast = index === lastIndex
            const first = index === 0

            return (
              <li
                key={step.title}
                className={[
                  'relative border-l-2 pb-8 pl-19 last:pb-0',
                  'min-[901px]:border-t-2 min-[901px]:border-l-0 min-[901px]:pt-5.5 min-[901px]:pr-6 min-[901px]:pb-0',
                  first ? 'min-[901px]:pl-0' : 'min-[901px]:pl-5',
                  isLast ? 'bd-step--accent border-pb-padi' : 'border-pb-laut',
                  RISE[index] ?? '',
                ].join(' ')}
              >
                {/* Garis tegak undakan (desktop): dari garis langkah ini turun
                    32px + tebal garis, menutup sudut garis langkah sebelumnya. */}
                {!first && (
                  <span
                    className="absolute top-0 -left-0.5 hidden h-8.5 w-0.5 bg-pb-laut min-[901px]:block"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={[
                    'absolute -top-1.5 left-5 font-display text-[44px] leading-none font-bold tracking-[-0.04em]',
                    'min-[901px]:top-auto min-[901px]:bottom-full min-[901px]:pb-1.5 min-[901px]:text-[64px]',
                    first ? 'min-[901px]:left-0' : 'min-[901px]:left-5',
                    isLast
                      ? 'text-pb-padi'
                      : 'text-pb-laut-tint [-webkit-text-stroke:1.5px_var(--color-pb-laut)]',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="bd-visually-hidden">
                  {howTo.stepLabel} {index + 1}
                </span>
                <h3 className="m-0 mb-2 font-display text-[22px] leading-tight font-bold tracking-[-0.01em]">
                  {step.title}
                </h3>
                <p className="m-0 text-base leading-normal text-pb-muted">{step.description}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
