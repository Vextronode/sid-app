// ==========================================
// PeraturanDesaPage.jsx
// Halaman publik daftar peraturan desa.
// Gaya dari public.css (kelas pb-*, di bawah .pub milik MainLayout).
// ==========================================

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, ScrollText } from 'lucide-react'

import { getPublicRegulations } from '@/features/peraturan/api'
import { PageLoader } from '@/components/ui/PageLoader'

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
      <header className="pb-pagehead">
        <div className="pb-container pb-pagehead-inner">
          <h1>Peraturan Desa</h1>
          <p>Daftar peraturan yang berlaku di desa. Ketuk judul untuk membaca isinya.</p>
        </div>
      </header>

      <div className="pb-container pb-page">
        {loading ? (
          <PageLoader label="Memuat peraturan desa..." />
        ) : error ? (
          <p className="pb-state pb-state--error" role="alert">
            {error}
          </p>
        ) : regulations.length === 0 ? (
          <p className="pb-state" role="status">
            Belum ada peraturan desa yang dipublikasikan.
          </p>
        ) : (
          <ul className="pb-reg-list">
            {regulations.map((item) => {
              const isOpen = openId === item.id
              const enactedDate = formatDate(item.enacted_date)

              return (
                <li key={item.id} className="pb-reg-item">
                  <button
                    type="button"
                    className="pb-reg-toggle"
                    aria-expanded={isOpen}
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                  >
                    <ScrollText size={20} aria-hidden="true" />

                    <span className="pb-reg-heading">
                      <strong>{item.title}</strong>
                      <span>
                        Nomor {item.regulation_number}
                        {enactedDate ? ` · Ditetapkan ${enactedDate}` : ''}
                      </span>
                    </span>

                    {isOpen ? (
                      <ChevronUp size={20} aria-hidden="true" />
                    ) : (
                      <ChevronDown size={20} aria-hidden="true" />
                    )}
                  </button>

                  {isOpen && <div className="pb-reg-body">{item.content}</div>}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
