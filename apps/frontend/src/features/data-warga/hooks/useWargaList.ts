/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import {
  getCitizens,
  createCitizen,
  updateCitizen,
  deleteCitizen,
  importCitizensExcel,
} from '../api'
import { usePageSize } from '@/components/ui/usePageSize'
import { useDebouncedValue } from '@/features/surat/hooks/useSuratListQuery'
import { useWilayahFilter } from './useWilayahFilter'

export function useWargaList() {
  const [citizens, setCitizens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [search, setSearchState] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSizeState] = usePageSize('data-penduduk')
  const [totalItems, setTotalItems] = useState(0)
  // Filter bertingkat Dusun -> RW -> RT; mengubahnya kembali ke halaman 1.
  const { filters, setFilter, params, hamletOptions, rwOptions, rtOptions, wilayahOptions } =
    useWilayahFilter(() => setCurrentPage(1))

  const debouncedSearch = useDebouncedValue(search.trim())

  // Pencarian nama, filter wilayah, dan pagination diproses di server.
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await getCitizens({
        page: currentPage,
        per_page: pageSize,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...params,
      })

      setCitizens(response.data?.data ?? [])
      setTotalItems(response.data?.meta?.total ?? response.data?.total ?? 0)
    } catch (err) {
      console.error('GET CITIZENS ERROR', err)
      setError(err?.response?.data?.message || 'Gagal memuat data warga.')
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, debouncedSearch, params])

  useEffect(() => {
    loadData()
  }, [loadData])

  const setSearch = (value) => {
    setSearchState(value)
    setCurrentPage(1)
  }

  const setPageSize = (value) => {
    setPageSizeState(value)
    setCurrentPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // Kalau halaman saat ini melebihi total (mis. setelah hapus data), mundurkan.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  // Baris yang diterima sudah merupakan satu halaman dari server.
  const data = citizens

  async function addCitizen(payload) {
    await createCitizen(payload)
    await loadData()
  }

  async function editCitizen(id, payload) {
    await updateCitizen(id, payload)
    await loadData()
  }

  async function removeCitizen(id) {
    await deleteCitizen(id)
    await loadData()
  }

  // Mengembalikan { total_rows, success_count, error_count, errors }
  async function importWargaExcel(file) {
    const formData = new FormData()
    formData.append('file', file)

    const res = await importCitizensExcel(formData)
    await loadData()
    return res.data?.data
  }

  return {
    data,
    loading,
    error,
    totalItems,
    reload: loadData,

    setSearch,

    filters,
    setFilter,
    hamletOptions,
    rwOptions,
    rtOptions,
    wilayahOptions,

    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    setPageSize,

    addCitizen,
    editCitizen,
    deleteWarga: removeCitizen,
    importWargaExcel,
  }
}
