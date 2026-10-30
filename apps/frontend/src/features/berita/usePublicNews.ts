import { useEffect, useState } from 'react'
import { getPublicNews } from './publicNewsApi'
import { mapNews } from './mapNews'

export function usePublicNews() {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await getPublicNews()
        const body = res.data?.data
        const list = Array.isArray(body) ? body : (body?.data ?? [])
        if (active) setNews(list.map(mapNews))
      } catch (err) {
        if (active) setError(err?.response?.data?.message || 'Gagal memuat berita.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  return { news, loading, error }
}
