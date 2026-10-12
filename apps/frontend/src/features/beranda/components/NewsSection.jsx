import { Newspaper } from 'lucide-react'
import { Link } from 'react-router-dom'

import { usePublicNews } from '@/features/berita/usePublicNews'
import { HAL_BERITA, HAL_BERITA_DETAIL } from '@/lib/constants/routes'
import {
  cardTitleHover,
  chip,
  sectionGap,
  sectionSubtitle,
  sectionTitle,
  stateBox,
  textLink,
} from '../publicClasses'
import { summarizeNews } from '../utils/newsSummary'

const NEWS_COUNT = 4

// Thumbnail berita, atau placeholder netral bila kosong (K2). Judul sudah ada
// di dalam link yang sama, jadi gambar diberi alt="" agar tidak dibaca dua kali.
function NewsImage({ src, className }) {
  const base = `relative block flex-none overflow-hidden bg-pb-laut-tint ${className}`

  if (!src) {
    return (
      <span
        className={`bd-news-image--empty ${base} flex items-center justify-center bg-(image:--pb-contour-dark) bg-size-[320px_auto] text-pb-laut`}
        aria-hidden="true"
      >
        <Newspaper size={32} strokeWidth={1.6} />
      </span>
    )
  }

  return (
    <span className={base}>
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className="block size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
      />
    </span>
  )
}

function NewsMeta({ categories = [], date }) {
  if (categories.length === 0 && !date) return null

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm leading-snug">
      {categories.map((category) => (
        <span key={category} className={`bd-news-category ${chip}`}>
          {category}
        </span>
      ))}
      {date && <span className="text-pb-muted">{date}</span>}
    </span>
  )
}

// Kabar desa (A20–A24): satu berita utama + tiga berita ringkas, seluruh kartu
// adalah link. Data dari usePublicNews (hook bersama). Chip kategori dari
// kategori berita yang diatur Petugas Desa (1-2 per berita).
export function NewsSection({ content }) {
  const { news: labels } = content
  const { news, loading, error } = usePublicNews()
  const [featured, ...others] = news.slice(0, NEWS_COUNT)

  let body
  if (loading) {
    body = (
      <p className={stateBox} role="status">
        {labels.loading}
      </p>
    )
  } else if (error) {
    body = (
      <p className={stateBox} role="alert">
        {error}
      </p>
    )
  } else if (!featured) {
    body = (
      <p className={stateBox} role="status">
        {labels.empty}
      </p>
    )
  } else {
    const summary = summarizeNews(featured)

    body = (
      <div className="grid items-start gap-8 min-[901px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] min-[901px]:gap-12">
        <Link
          to={HAL_BERITA_DETAIL(featured.id)}
          className="bd-lift group flex flex-col gap-5 text-pb-ink no-underline hover:text-pb-ink"
        >
          <NewsImage src={featured.imageUrl} className="aspect-16/10 rounded-3xl" />
          <div className="flex min-w-0 flex-col gap-2.5">
            <NewsMeta categories={featured.categories} date={featured.date} />
            <h3
              className={`m-0 font-display text-[clamp(22px,18px+0.8vw,28px)] leading-[1.15] font-bold tracking-[-0.02em] text-balance ${cardTitleHover}`}
            >
              {featured.title}
            </h3>
            {summary && (
              <p className="mt-1 mb-0 max-w-[60ch] text-[17px] leading-relaxed text-pb-muted">
                {summary}
              </p>
            )}
          </div>
        </Link>

        {others.length > 0 && (
          <ul className="m-0 flex list-none flex-col border-t border-pb-line p-0">
            {others.map((item) => (
              <li key={item.id} className="border-b border-pb-line">
                <Link
                  to={HAL_BERITA_DETAIL(item.id)}
                  className="bd-lift group flex items-center gap-5 py-5.5 text-pb-ink no-underline hover:text-pb-ink"
                >
                  <NewsImage
                    src={item.imageUrl}
                    className="size-28 rounded-2xl max-[400px]:size-22"
                  />
                  <div className="flex min-w-0 flex-col gap-2">
                    <NewsMeta categories={item.categories} date={item.date} />
                    <h3
                      className={`m-0 font-display text-xl leading-tight font-bold tracking-[-0.01em] text-pretty ${cardTitleHover}`}
                    >
                      {item.title}
                    </h3>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <section className={`bd-container bd-news ${sectionGap}`} aria-labelledby="bd-news-title">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <h2 id="bd-news-title" className={sectionTitle}>
            {labels.title}
          </h2>
          <p className={sectionSubtitle}>{labels.subtitle}</p>
        </div>
        <Link to={HAL_BERITA} className={textLink}>
          {labels.allLink}
        </Link>
      </div>
      {body}
    </section>
  )
}
