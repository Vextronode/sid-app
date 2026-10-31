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
import type { Citizen, Id } from '@/types'
import { useWilayahFilter } from './useWilayahFilter'
import { getApiErrorMessage } from '@/shared/lib/apiError'

type CitizenPayload = Record<string, unknown>

// Hasil impor Excel (POST /api/citizens/import).
export type CitizenImportResult = {
  total_rows: number
  success_count: number
  error_count: number
  errors: { row: number; message: string }[]
}

export function useWargaList() {
  const [citizens, setCitizens] = useState<Citizen[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      setError(getApiErrorMessage(err, 'Gagal memuat data warga.'))
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, debouncedSearch, params])

  useEffect(() => {
    loadData()
  }, [loadData])

  const setSearch = (value: string) => {
    setSearchState(value)
    setCurrentPage(1)
  }

  const setPageSize = (value: number) => {
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

  async function addCitizen(payload: CitizenPayload) {
    await createCitizen(payload)
    await loadData()
  }

  async function editCitizen(id: Id, payload: CitizenPayload) {
    await updateCitizen(id, payload)
    await loadData()
  }

  async function removeCitizen(id: Id) {
    await deleteCitizen(id)
    await loadData()
  }

  // Mengembalikan { total_rows, success_count, error_count, errors }
  async function importWargaExcel(file: File): Promise<CitizenImportResult | undefined> {
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
