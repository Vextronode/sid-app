import { useEffect, useState } from 'react'
import { getPublicNews } from './publicNewsApi'
import { mapNews } from './mapNews'
import type { NewsItem } from './mapNews'
import { getApiErrorMessage } from '@/shared/lib/apiError'

export function usePublicNews() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await getPublicNews()
        const body = res.data?.data
        const list = Array.isArray(body) ? body : (body?.data ?? [])
        if (active) setNews(list.map(mapNews))
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, 'Gagal memuat berita.'))
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
