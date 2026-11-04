// ==========================================
// PeraturanList.tsx
// Daftar peraturan desa untuk halaman publik (section di Profil Desa).
// Mengambil datanya sendiri, jadi kegagalan di sini tidak menjatuhkan
// halaman yang memuatnya.
// ==========================================

import { useEffect, useState } from 'react'
import { ChevronDown, ScrollText } from 'lucide-react'

import { getPublicRegulations } from '@/features/peraturan/api'
import type { Regulation } from '@/features/peraturan/api'
import { PageLoader } from '@/components/ui/PageLoader'
import { cardTitleHover, errorBox, stateBox } from '@/features/beranda/publicClasses'
import { getApiErrorMessage, apiErrorStatus } from '@/shared/lib/apiError'

function formatDate(value: string | null | undefined) {
  if (!value) return null

  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function PeraturanList() {
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await getPublicRegulations()
        const items = res.data?.data

        if (active) setRegulations(Array.isArray(items) ? items : [])
      } catch (err) {
        // Backend menjawab 404 bila belum ada peraturan; itu keadaan kosong, bukan error.
        if (!active) return
        if (apiErrorStatus(err) === 404) setRegulations([])
        else setError(getApiErrorMessage(err, 'Gagal memuat peraturan desa.'))
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [])

  if (loading) return <PageLoader label="Memuat peraturan desa..." />

  if (error) {
    return (
      <p className={errorBox} role="alert">
        {error}
      </p>
    )
  }

  if (regulations.length === 0) {
    return (
      <p className={stateBox} role="status">
        Belum ada peraturan desa yang dipublikasikan.
      </p>
    )
  }

  return (
    <ul className="m-0 flex max-w-220 list-none flex-col gap-3 p-0">
      {regulations.map((item) => {
        const isOpen = openId === item.id
        const enactedDate = formatDate(item.enacted_date)
        // Nomor atau tanggal yang kosong tidak ditampilkan ("Nomor -").
        const meta = [
          item.regulation_number?.trim() ? `Nomor ${item.regulation_number.trim()}` : null,
          enactedDate ? `Ditetapkan ${enactedDate}` : null,
        ].filter(Boolean)
        const contentId = `peraturan-${item.id}`

        return (
          <li
            key={item.id}
            className={`overflow-hidden rounded-2xl border bg-white transition-[border-color,box-shadow] duration-200 ${
              isOpen
                ? 'border-pb-laut/40 shadow-[0_10px_30px_-18px_rgb(15_23_42/0.35)]'
                : 'border-pb-line hover:border-pb-line-strong hover:shadow-[0_10px_30px_-20px_rgb(15_23_42/0.3)]'
            }`}
          >
            <button
              type="button"
              className="group flex w-full cursor-pointer items-center gap-4 border-0 bg-transparent px-5 py-4.5 text-left text-pb-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pb-laut max-sm:gap-3 max-sm:px-4"
              aria-expanded={isOpen}
              aria-controls={contentId}
              onClick={() => setOpenId(isOpen ? null : item.id)}
            >
              <span
                className="flex size-12 flex-none items-center justify-center rounded-xl bg-pb-laut-tint text-pb-laut transition-colors group-aria-expanded:bg-pb-laut group-aria-expanded:text-white"
                aria-hidden="true"
              >
                <ScrollText size={22} strokeWidth={1.8} />
              </span>

              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <strong
                  className={`font-display text-lg leading-snug font-bold text-pb-ink transition-colors sm:text-xl ${cardTitleHover}`}
                >
                  {item.title}
                </strong>
                {meta.length > 0 && (
                  <span className="text-[15px] leading-snug text-pb-muted">{meta.join(' · ')}</span>
                )}
              </span>

              <span
                className="flex size-9 flex-none items-center justify-center rounded-full text-pb-muted transition-[background-color,color,transform] duration-200 group-hover:bg-pb-laut-tint group-hover:text-pb-laut group-aria-expanded:rotate-180"
                aria-hidden="true"
              >
                <ChevronDown size={20} />
              </span>
            </button>

            {isOpen && (
              <div
                id={contentId}
                className="border-t border-pb-line px-5 pt-4 pb-6 pl-21 text-[17px] leading-[1.7] whitespace-pre-line text-pb-ink max-sm:px-4"
              >
                {item.content}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
