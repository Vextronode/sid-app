/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getCitizens,
  createCitizen,
  updateCitizen,
  deleteCitizen,
  importCitizensExcel,
} from '../api'
import { usePageSize } from '@/components/ui/usePageSize'
import { getHamlets, getRts, getRws } from '@/features/kelola-wilayah/api'
import { useDebouncedValue } from '@/features/surat/hooks/useSuratListQuery'

const EMPTY_FILTERS = { hamletId: '', rwId: '', rtId: '' }

export function useWargaList() {
  const [citizens, setCitizens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [search, setSearchState] = useState('')
  // Filter bertingkat Dusun -> RW -> RT.
  const [filters, setFiltersState] = useState(EMPTY_FILTERS)
  const [wilayah, setWilayah] = useState({ hamlets: [], rws: [], rts: [] })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSizeState] = usePageSize('data-penduduk')
  const [totalItems, setTotalItems] = useState(0)

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
        ...(filters.hamletId ? { hamlet_id: filters.hamletId } : {}),
        ...(filters.rwId ? { rw_id: filters.rwId } : {}),
        ...(filters.rtId ? { rt_id: filters.rtId } : {}),
      })

      setCitizens(response.data?.data ?? [])
      setTotalItems(response.data?.meta?.total ?? response.data?.total ?? 0)
    } catch (err) {
      console.error('GET CITIZENS ERROR', err)
      setError(err?.response?.data?.message || 'Gagal memuat data warga.')
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, debouncedSearch, filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Pilihan wilayah tidak bergantung pada halaman warga yang sedang dibuka.
  useEffect(() => {
    let active = true

    Promise.all([getHamlets(), getRws(), getRts()])
      .then(([hamletRes, rwRes, rtRes]) => {
        if (!active) return

        setWilayah({
          hamlets: hamletRes.data?.data ?? [],
          rws: rwRes.data?.data ?? [],
          rts: rtRes.data?.data ?? [],
        })
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

  // Memilih tingkat atas mengosongkan tingkat di bawahnya.
  const setFilter = (level, value) => {
    setFiltersState((current) => {
      if (level === 'hamletId') return { hamletId: value, rwId: '', rtId: '' }
      if (level === 'rwId') return { ...current, rwId: value, rtId: '' }

      return { ...current, rtId: value }
    })
    setCurrentPage(1)
  }

  const setPageSize = (value) => {
    setPageSizeState(value)
    setCurrentPage(1)
  }

  const { hamletOptions, rwOptions, rtOptions, wilayahOptions } = useMemo(() => {
    const rwById = new Map(wilayah.rws.map((rw) => [String(rw.id), rw]))
    const rwsInHamlet = filters.hamletId
      ? wilayah.rws.filter((rw) => String(rw.hamlet_id) === filters.hamletId)
      : wilayah.rws
    const allowedRwIds = new Set(
      filters.rwId ? [filters.rwId] : rwsInHamlet.map((rw) => String(rw.id)),
    )

    return {
      hamletOptions: wilayah.hamlets.map((hamlet) => ({
        value: String(hamlet.id),
        label: hamlet.name,
      })),
      rwOptions: rwsInHamlet.map((rw) => ({ value: String(rw.id), label: `RW ${rw.number}` })),
      rtOptions: wilayah.rts
        .filter((rt) => allowedRwIds.has(String(rt.rw_id)))
        .map((rt) => ({
          value: String(rt.id),
          label: filters.rwId
            ? `RT ${rt.number}`
            : `RT ${rt.number} / RW ${rwById.get(String(rt.rw_id))?.number ?? '-'}`,
        })),
      // Semua RT untuk pilihan RT di form tambah/edit warga.
      wilayahOptions: wilayah.rts.map((rt) => ({
        ...rt,
        label: `RT ${rt.number} / RW ${rwById.get(String(rt.rw_id))?.number ?? '-'}`,
      })),
    }
  }, [wilayah, filters.hamletId, filters.rwId])

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
