/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getCitizens,
  getWilayah,
  createCitizen,
  updateCitizen,
  deleteCitizen,
  importCitizensExcel,
} from '../api'

const ITEMS_PER_PAGE = 10

export function useWargaList() {
  const [citizens, setCitizens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [search, setSearchState] = useState('')
  const [filterWilayah, setFilterWilayahState] = useState('')
  const [wilayahOptions, setWilayahOptions] = useState([])
  const [currentPage, setCurrentPage] = useState(1)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [citizenRes, wilayahRes] = await Promise.all([getCitizens(), getWilayah()])

      setCitizens(citizenRes.data?.data ?? [])

      // Wilayah diambil dari daftar warga, jadi bisa ada duplikat RT.
      // Hilangkan duplikat berdasarkan rt_id.
      const byRt = new Map()
      ;(wilayahRes.data?.data ?? []).forEach((item) => {
        if (item.rt_id && !byRt.has(item.rt_id)) {
          byRt.set(item.rt_id, item)
        }
      })
      setWilayahOptions([...byRt.values()])
    } catch (err) {
      console.error('GET CITIZENS ERROR', err)
      setError(err?.response?.data?.message || 'Gagal memuat data warga.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const setSearch = (value) => {
    setSearchState(value)
    setCurrentPage(1)
  }

  const setFilterWilayah = (value) => {
    setFilterWilayahState(value)
    setCurrentPage(1)
  }

  const filtered = useMemo(() => {
    let result = [...citizens]

    // Backend hanya mengirim nik_masked, jadi pencarian hanya by nama.
    if (search) {
      const keyword = search.toLowerCase()
      result = result.filter((warga) => warga.name?.toLowerCase().includes(keyword))
    }

    if (filterWilayah) {
      result = result.filter((warga) => String(warga.rt_id) === String(filterWilayah))
    }

    return result
  }, [citizens, search, filterWilayah])

  const totalItems = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))

  // Kalau halaman saat ini melebihi total (mis. setelah hapus data), mundurkan.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const data = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, currentPage])

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
    setCitizens((prev) => prev.filter((item) => item.id !== id))
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
