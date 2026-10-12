import '@/styles/beranda.css'

import { useEffect } from 'react'

import { INFO_PAGES } from '../infoPagesContent'

// Halaman informasi khusus dev (D6): Kebijakan privasi, Aksesibilitas, PPID.
// Dirender di dalam MainLayout (yang sudah punya <main>), jadi isinya <article>.
// Gaya dari public.css di bawah .pub (kelas bd-info-*).

const SLOT_PATTERN = /(\[[^\]]+\])/

// "[TEKS DALAM KURUNG SIKU]" ditampilkan sebagai slot yang terlihat jelas; teksnya tidak diubah.
function renderText(text) {
  return text
    .split(SLOT_PATTERN)
    .filter(Boolean)
    .map((part, index) =>
      SLOT_PATTERN.test(part) ? (
        <mark key={index} className="bd-info-slot">
          {part}
        </mark>
      ) : (
        part
      ),
    )
}

function InfoBlock({ block }) {
  switch (block.type) {
    case 'h2':
      return <h2 className="bd-info-h2">{renderText(block.text)}</h2>
    case 'h3':
      return <h3 className="bd-info-h3">{renderText(block.text)}</h3>
    case 'ul':
    case 'ol': {
      const List = block.type
      return (
        <List className={`bd-info-list bd-info-list--${block.type}`}>
          {block.items.map((item) => (
            <li key={item}>{renderText(item)}</li>
          ))}
        </List>
      )
    }
    default:
      return <p>{renderText(block.text)}</p>
  }
}

export function InfoPage({ page }) {
  const content = INFO_PAGES[page]

  // Aplikasi tidak punya scroll restoration, dan link footer ada di dasar beranda.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page])

  if (!content) return null

  return (
    <div className="bd-root bd-info">
      <article className="bd-container bd-info-article">
        <h1 className="bd-info-title">{content.title}</h1>
        <p className="bd-info-status">{renderText(content.status)}</p>
        {content.blocks.map((block, index) => (
          <InfoBlock key={index} block={block} />
        ))}
      </article>
    </div>
  )
}
