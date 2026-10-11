import { Newspaper } from 'lucide-react'
import { Link } from 'react-router-dom'

import { usePublicNews } from '@/features/berita/usePublicNews'
import { HAL_BERITA, HAL_BERITA_DETAIL } from '@/lib/constants/routes'
import { summarizeNews } from '../utils/newsSummary'

const NEWS_COUNT = 4

// Thumbnail berita, atau placeholder netral bila kosong (K2). Judul sudah ada
// di dalam link yang sama, jadi gambar diberi alt="" agar tidak dibaca dua kali.
function NewsImage({ src, className }) {
  if (!src) {
    return (
      <span className={`${className} bd-news-image--empty`} aria-hidden="true">
        <Newspaper size={32} />
      </span>
    )
  }

  return (
    <span className={className}>
      <img src={src} alt="" loading="lazy" decoding="async" />
    </span>
  )
}

function NewsMeta({ category, date, featured }) {
  if (!category && !date) return null

  return (
    <span className={`bd-news-meta${featured ? ' bd-news-meta--feature' : ''}`}>
      {category && <span className="bd-news-category">{category}</span>}
      {date && <span className="bd-news-date">{date}</span>}
    </span>
  )
}

// Kabar desa (A20–A24): satu berita utama + tiga berita ringkas, seluruh kartu
// adalah link. Data dari usePublicNews (hook bersama, tidak diubah). Chip
// kategori belum ada datanya: dummy hanya di development (K7).
export function NewsSection({ content }) {
  const { news: labels, newsCategories } = content
  const { news, loading, error } = usePublicNews()
  const [featured, ...others] = news.slice(0, NEWS_COUNT)

  let body
  if (loading) {
    body = (
      <p className="bd-news-state" role="status">
        {labels.loading}
      </p>
    )
  } else if (error) {
    body = (
      <p className="bd-news-state" role="alert">
        {error}
      </p>
    )
  } else if (!featured) {
    body = (
      <p className="bd-news-state" role="status">
        {labels.empty}
      </p>
    )
  } else {
    const summary = summarizeNews(featured)

    body = (
      <div className="bd-news-layout">
        <Link
          to={HAL_BERITA_DETAIL(featured.id)}
          className="bd-news-card bd-news-card--feature bd-lift"
        >
          <NewsImage src={featured.imageUrl} className="bd-news-image bd-news-image--feature" />
          <div className="bd-news-body bd-news-body--feature">
            <NewsMeta category={newsCategories?.[0]} date={featured.date} featured />
            <h3 className="bd-news-title bd-news-title--feature">{featured.title}</h3>
            {summary && <p className="bd-news-summary">{summary}</p>}
          </div>
        </Link>

        {others.length > 0 && (
          <ul className="bd-news-list">
            {others.map((item, index) => (
              <li key={item.id}>
                <Link
                  to={HAL_BERITA_DETAIL(item.id)}
                  className="bd-news-card bd-news-card--compact bd-lift"
                >
                  <NewsImage src={item.imageUrl} className="bd-news-image bd-news-image--thumb" />
                  <div className="bd-news-body">
                    <NewsMeta category={newsCategories?.[index + 1]} date={item.date} />
                    <h3 className="bd-news-title">{item.title}</h3>
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
    <section className="bd-container bd-news" aria-labelledby="bd-news-title">
      <div className="bd-section-head">
        <div>
          <h2 id="bd-news-title" className="bd-section-title">
            {labels.title}
          </h2>
          <p className="bd-section-subtitle">{labels.subtitle}</p>
        </div>
        <Link to={HAL_BERITA} className="bd-section-link">
          {labels.allLink}
        </Link>
      </div>
      {body}
    </section>
  )
}
