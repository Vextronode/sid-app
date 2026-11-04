import { useCallback, useEffect, useState } from 'react'

import { usePageSize } from '@/components/ui/usePageSize'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import type { PageMeta, PaginatedResponse } from '@/types'

type ListParams = { status?: string; page?: number; per_page?: number }

const EMPTY_META: Pick<PageMeta, 'current_page' | 'last_page' | 'total'> = {
  current_page: 1,
  last_page: 1,
  total: 0,
}

/**
 * Daftar permintaan untuk petugas (aktivasi akun, ganti foto profil):
 * filter status, halaman, dan ukuran halaman.
 */
export function useRequestList<T>(
  fetcher: (params: ListParams) => Promise<PaginatedResponse<T>>,
  pageSizeKey: string,
  errorMessage: string,
) {
  const [items, setItems] = useState<T[]>([])
  const [meta, setMeta] = useState(EMPTY_META)
  const [status, setStatusState] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = usePageSize(pageSizeKey)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const response = await fetcher({ status, page, per_page: pageSize })

      setItems(response.data ?? [])
      setMeta(response.meta ?? EMPTY_META)
      setError('')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, errorMessage))
    } finally {
      setLoading(false)
    }
  }, [fetcher, status, page, pageSize, errorMessage])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  return {
    items,
    meta,
    status,
    setStatus: (value: string) => {
      setStatusState(value)
      setPage(1)
    },
    setPage,
    pageSize,
    setPageSize: (value: number) => {
      setPageSizeState(value)
      setPage(1)
    },
    loading,
    error,
    setError,
    load,
  }
}
