/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { getSuratDetail } from '@/lib/api'
import type { Id, Letter } from '@/types'

export function useSuratDetail(id: Id | null) {
  const [surat, setSurat] = useState<Letter | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const fetchDetail = async () => {
    try {
      setIsLoading(true)
      const response = await getSuratDetail(id)
      setSurat(response.data.data)
      setNotFound(false)
    } catch (error) {
      console.error('RW FYI DETAIL ERROR', error.response?.data ?? error)
      if (error.response?.status === 404) {
        setNotFound(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchDetail()
    }
  }, [id])

  return { surat, isLoading, notFound, refresh: fetchDetail }
}
