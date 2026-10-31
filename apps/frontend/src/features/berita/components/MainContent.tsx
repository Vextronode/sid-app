import { chip, metaRow } from '@/features/beranda/publicClasses'

import type { NewsItem } from '../mapNews'

// Isi detail berita (halaman publik, utility Tailwind).
export function MainContent({ berita }: { berita: NewsItem }) {
  return (
    <article>
      <header className="pb-7">
        {(berita.categories?.length > 0 || berita.date) && (
          <div className={metaRow}>
            {berita.categories?.map((category) => (
              <span key={category} className={chip}>
                {category}
              </span>
            ))}
            {berita.date && <span>{berita.date}</span>}
          </div>
        )}
        <h1 className="mt-3.5 mb-0 max-w-[22ch] font-display text-[clamp(32px,22px+2.4vw,54px)] leading-[1.04] font-bold tracking-[-0.03em] text-balance text-pb-laut-deep">
          {berita.title}
        </h1>
      </header>

      {berita.imageUrl && (
        <div className="mb-10 overflow-hidden rounded-3xl bg-pb-laut-tint">
          <img
            src={berita.imageUrl}
            alt={berita.title}
            className="block max-h-140 w-full object-cover"
          />
        </div>
      )}

      <div className="max-w-[68ch] text-[19px] leading-[1.75] text-pb-ink">
        {berita.content?.map((text, idx) => (
          <p key={idx} className="mt-0 mb-[1.1em]">
            {text}
          </p>
        ))}
      </div>
    </article>
  )
}
