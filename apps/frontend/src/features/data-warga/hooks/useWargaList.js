/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import {
  getCitizens,
  createCitizen,
  updateCitizen,
  deleteCitizen,
  importCitizensExcel,
} from '../api'
import { getRts, getRws } from '@/features/kelola-wilayah/api'
import { useDebouncedValue } from '@/features/surat/hooks/useSuratListQuery'

const ITEMS_PER_PAGE = 10

export function useWargaList() {
  const [citizens, setCitizens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [search, setSearchState] = useState('')
  const [filterWilayah, setFilterWilayahState] = useState('')
  const [wilayahOptions, setWilayahOptions] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const debouncedSearch = useDebouncedValue(search.trim())

  // Pencarian nama, filter RT, dan pagination diproses di server.
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await getCitizens({
        page: currentPage,
        per_page: ITEMS_PER_PAGE,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(filterWilayah ? { rt_id: filterWilayah } : {}),
      })

      setCitizens(response.data?.data ?? [])
      setTotalItems(response.data?.meta?.total ?? response.data?.total ?? 0)
    } catch (err) {
      console.error('GET CITIZENS ERROR', err)
      setError(err?.response?.data?.message || 'Gagal memuat data warga.')
    } finally {
      setLoading(false)
    }
  }, [currentPage, debouncedSearch, filterWilayah])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Pilihan RT/RW tidak bergantung pada halaman warga yang sedang dibuka.
  useEffect(() => {
    let active = true

    Promise.all([getRts(), getRws()])
      .then(([rtRes, rwRes]) => {
        if (!active) return

        const rwNumbers = new Map((rwRes.data?.data ?? []).map((rw) => [String(rw.id), rw.number]))

        setWilayahOptions(
          (rtRes.data?.data ?? []).map((rt) => ({
            ...rt,
            label: `RT ${rt.number} / RW ${rwNumbers.get(String(rt.rw_id)) ?? '-'}`,
          })),
        )
      })
      .catch((err) => console.error('GET WILAYAH OPTIONS ERROR', err))

    return () => {
      active = false
    }
  }, [])

  const setSearch = (value) => {
    setSearchState(value)
    setCurrentPage(1)
  }

  const setFilterWilayah = (value) => {
    setFilterWilayahState(value)
    setCurrentPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))

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

    setSearch,

    filterWilayah,
    setFilterWilayah,
    wilayahOptions,

    currentPage,
    setCurrentPage,
    totalPages,

    addCitizen,
    editCitizen,
    deleteWarga: removeCitizen,
    importWargaExcel,
  }
}
