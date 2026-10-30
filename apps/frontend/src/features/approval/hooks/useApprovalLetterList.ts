import { useCallback, useState } from 'react'

import { usePageSize } from '@/components/ui/usePageSize'
import { useDebouncedValue, useSuratListQuery } from '@/features/surat/hooks/useSuratListQuery'

// Filter status, pencarian, dan halaman diproses di server; hook ini hanya
// menyimpan pilihan pengguna dan mengembalikan baris halaman yang aktif.
// Jumlah baris per halaman dipilih pengguna dan sama untuk semua daftar
// surat warga milik pejabat.
export function useApprovalLetterList({ initialStatus = '' } = {}) {
  const [search, setSearchState] = useState('')
  const [filterStatus, setFilterStatusState] = useState(initialStatus)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = usePageSize('surat-warga')

  const debouncedSearch = useDebouncedValue(search.trim())

  const { letters, meta, loading, refresh } = useSuratListQuery({
    page,
    per_page: pageSize,
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

  const setPageSize = useCallback(
    (value) => {
      setPageSizeState(value)
      setPage(1)
    },
    [setPageSizeState],
  )

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
    pageSize,
    setPageSize,
    refresh,
  }
}
