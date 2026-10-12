import '@/styles/beranda.css'

import { useEffect } from 'react'

import { INFO_PAGES } from '../infoPagesContent'

// Halaman informasi khusus dev (D6): Kebijakan privasi, Aksesibilitas, PPID.
// Dirender di dalam MainLayout (yang sudah punya <main>), jadi isinya <article>.
// Ditata dengan utility Tailwind (token di index.css); kelas bd-info-* tetap
// ada sebagai penanda untuk tes.

const SLOT_PATTERN = /(\[[^\]]+\])/

// "[TEKS DALAM KURUNG SIKU]" ditampilkan sebagai slot yang terlihat jelas; teksnya tidak diubah.
function renderText(text) {
  return text
    .split(SLOT_PATTERN)
    .filter(Boolean)
    .map((part, index) =>
      SLOT_PATTERN.test(part) ? (
        <mark key={index} className="bd-info-slot rounded-sm bg-pb-padi-soft px-1 text-pb-padi-ink">
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
      return (
        <h2 className="mt-12 mb-3 font-display text-[clamp(22px,18px+0.8vw,28px)] leading-[1.15] font-bold tracking-[-0.02em]">
          {renderText(block.text)}
        </h2>
      )
    case 'h3':
      return <h3 className="mt-7 mb-2 font-display text-xl font-bold">{renderText(block.text)}</h3>
    case 'ul':
    case 'ol': {
      const List = block.type
      return (
        <List
          className={`mt-0 mb-4 pl-[1.4em] [&>li+li]:mt-1.5 ${block.type === 'ul' ? 'list-disc' : 'list-decimal'}`}
        >
          {block.items.map((item) => (
            <li key={item}>{renderText(item)}</li>
          ))}
        </List>
      )
    }
    default:
      return <p className="mt-0 mb-4">{renderText(block.text)}</p>
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
      <article className="bd-container">
        <div className="max-w-[72ch] pt-[clamp(40px,24px+4vw,88px)] text-lg leading-[1.7]">
          <h1 className="m-0 font-display text-[clamp(34px,24px+2.4vw,56px)] leading-[1.04] font-bold tracking-[-0.03em] text-pb-laut-deep">
            {content.title}
          </h1>
          <p className="bd-info-status mt-5 mb-8 rounded-r-[10px] border-l-[3px] border-pb-padi bg-pb-padi-soft px-4.5 py-3.5 text-base text-[#3d2c00]">
            {renderText(content.status)}
          </p>
          {content.blocks.map((block, index) => (
            <InfoBlock key={index} block={block} />
          ))}
        </div>
      </article>
    </div>
  )
}
