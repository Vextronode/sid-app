import { useCallback, useState } from 'react'

import { useDebouncedValue, useSuratListQuery } from '@/features/surat/hooks/useSuratListQuery'

// Filter status, pencarian, dan halaman diproses di server; hook ini hanya
// menyimpan pilihan pengguna dan mengembalikan baris halaman yang aktif.
export function useApprovalLetterList({ initialStatus = '', perPage = 5 } = {}) {
  const [search, setSearchState] = useState('')
  const [filterStatus, setFilterStatusState] = useState(initialStatus)
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebouncedValue(search.trim())

  const { letters, meta, loading, refresh } = useSuratListQuery({
    page,
    per_page: perPage,
    status: filterStatus,
    search: debouncedSearch,
  })

  const setSearch = useCallback((value) => {
    setSearchState(value)
    setPage(1)
  }, [])

  const setFilterStatus = useCallback((value) => {
    setFilterStatusState(value)
    setPage(1)
  }, [])

  const totalPages = Math.max(1, meta.last_page)

  return {
    data: letters,
    loading,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    totalItems: meta.total,
    totalPages,
    // Halaman bisa melebihi total setelah data berkurang (mis. surat diproses).
    currentPage: Math.min(page, totalPages),
    setCurrentPage: setPage,
    refresh,
  }
}
