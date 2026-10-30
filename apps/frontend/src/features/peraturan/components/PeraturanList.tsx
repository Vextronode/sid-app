// ==========================================
// PeraturanList.tsx
// Daftar peraturan desa untuk halaman publik (section di Profil Desa).
// Mengambil datanya sendiri, jadi kegagalan di sini tidak menjatuhkan
// halaman yang memuatnya.
// ==========================================

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, ScrollText } from 'lucide-react'

import { getPublicRegulations } from '@/features/peraturan/api'
import type { Regulation } from '@/features/peraturan/api'
import { PageLoader } from '@/components/ui/PageLoader'
import { errorBox, stateBox } from '@/features/beranda/publicClasses'
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
                <ChevronDown className="flex-none text-pb-muted" size={20} aria-hidden="true" />
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
  )
}
