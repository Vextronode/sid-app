// ==========================================
// PeraturanDesaPage.jsx
// Halaman publik daftar peraturan desa.
// Ditata dengan utility Tailwind, di bawah .pub milik MainLayout.
// ==========================================

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, ScrollText } from 'lucide-react'

import { getPublicRegulations } from '@/features/peraturan/api'
import { PageLoader } from '@/components/ui/PageLoader'
import { PublicPageHead } from '@/components/layout/PublicPageHead'
import { errorBox, stateBox } from '@/features/beranda/publicClasses'

function formatDate(value) {
  if (!value) return null

  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function PeraturanDesaPage() {
  const [regulations, setRegulations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await getPublicRegulations()

        if (active) setRegulations(res.data?.data ?? [])
      } catch (err) {
        if (active) setError(err?.response?.data?.message || 'Gagal memuat peraturan desa.')
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [])

  return (
    <>
      <PublicPageHead title="Peraturan Desa">
        <p>Daftar peraturan yang berlaku di desa. Ketuk judul untuk membaca isinya.</p>
      </PublicPageHead>

      <div className="bd-container pt-[clamp(32px,20px+3vw,64px)]">
        {loading ? (
          <PageLoader label="Memuat peraturan desa..." />
        ) : error ? (
          <p className={errorBox} role="alert">
            {error}
          </p>
        ) : regulations.length === 0 ? (
          <p className={stateBox} role="status">
            Belum ada peraturan desa yang dipublikasikan.
          </p>
        ) : (
          <ul className="m-0 flex max-w-220 list-none flex-col border-t border-pb-line p-0">
            {regulations.map((item) => {
              const isOpen = openId === item.id
              const enactedDate = formatDate(item.enacted_date)

              return (
                <li key={item.id} className="border-b border-pb-line">
                  <button
                    type="button"
                    className="group flex w-full cursor-pointer items-center gap-4.5 border-0 bg-transparent px-2 py-5.5 text-left text-pb-ink hover:bg-white max-sm:gap-3.5 max-sm:px-0"
                    aria-expanded={isOpen}
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                  >
                    <span
                      className="flex size-12 flex-none items-center justify-center rounded-[14px] bg-pb-laut-tint text-pb-laut group-aria-expanded:bg-pb-laut group-aria-expanded:text-white"
                      aria-hidden="true"
                    >
                      <ScrollText size={22} strokeWidth={1.8} />
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <strong className="font-display text-xl leading-tight font-bold">
                        {item.title}
                      </strong>
                      <span className="text-[15px] text-pb-muted">
                        Nomor {item.regulation_number}
                        {enactedDate ? ` · Ditetapkan ${enactedDate}` : ''}
                      </span>
                    </span>

                    {isOpen ? (
                      <ChevronUp className="flex-none text-pb-muted" size={20} aria-hidden="true" />
                    ) : (
                      <ChevronDown
                        className="flex-none text-pb-muted"
                        size={20}
                        aria-hidden="true"
                      />
                    )}
                  </button>

                  {isOpen && (
                    <div className="mr-2 mb-6 ml-18.5 rounded-r-2xl border-l-[3px] border-pb-padi bg-white px-6 py-5 text-[17px] leading-[1.7] whitespace-pre-line max-sm:ml-0">
                      {item.content}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
