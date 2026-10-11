// ==========================================
// PeraturanDesaPage.jsx
// Halaman publik daftar peraturan desa.
// ==========================================

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, ScrollText } from 'lucide-react'

import { getPublicRegulations } from '@/features/peraturan/api'

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
    <div className="sid-peraturan-page">
      <main className="sid-peraturan-content">
        <h1 className="sid-beranda-section-title">Peraturan Desa</h1>
        <p className="sid-peraturan-description">
          Daftar peraturan yang berlaku di desa. Ketuk judul untuk membaca isinya.
        </p>

        {loading ? (
          <p className="sid-beranda-news-state" role="status">
            Memuat peraturan desa...
          </p>
        ) : error ? (
          <p className="sid-beranda-news-state" role="alert">
            {error}
          </p>
        ) : regulations.length === 0 ? (
          <p className="sid-beranda-news-state" role="status">
            Belum ada peraturan desa yang dipublikasikan.
          </p>
        ) : (
          <ul className="sid-peraturan-list">
            {regulations.map((item) => {
              const isOpen = openId === item.id
              const enactedDate = formatDate(item.enacted_date)

              return (
                <li key={item.id} className="sid-peraturan-item">
                  <button
                    type="button"
                    className="sid-peraturan-toggle"
                    aria-expanded={isOpen}
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                  >
                    <ScrollText size={20} aria-hidden="true" />

                    <span className="sid-peraturan-heading">
                      <strong>{item.title}</strong>
                      <span>
                        Nomor {item.regulation_number}
                        {enactedDate ? ` · Ditetapkan ${enactedDate}` : ''}
                      </span>
                    </span>

                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>

                  {isOpen && <div className="sid-peraturan-body">{item.content}</div>}
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
