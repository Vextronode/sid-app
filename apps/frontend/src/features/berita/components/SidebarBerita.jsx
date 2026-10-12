import { Link } from 'react-router-dom'

import { cardTitleHover } from '@/features/beranda/publicClasses'

// Daftar berita lain di samping detail berita (halaman publik, utility Tailwind).
export function SidebarBerita({ beritaLain }) {
  return (
    <aside className="rounded-3xl border border-pb-line bg-white px-6 pt-6 pb-2 lg:sticky lg:top-24">
      <h3 className="mt-0 mb-1 font-display text-[22px] font-bold tracking-[-0.01em] first-letter:uppercase">
        berita lain
      </h3>

      <div className="flex flex-col">
        {beritaLain.map((item) => (
          <Link
            key={item.id}
            to={`/berita/${item.id}`}
            className="group flex flex-col gap-1.5 border-t border-pb-line py-4 text-pb-ink no-underline first:border-t-0"
          >
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.title}
                className="mb-1.5 aspect-video w-full rounded-xl object-cover"
              />
            )}
            <h4 className={`m-0 font-display text-lg leading-tight font-bold ${cardTitleHover}`}>
              {item.title}
            </h4>
            <span className="text-sm text-pb-muted">{item.date}</span>
          </Link>
        ))}
      </div>
    </aside>
  )
}
