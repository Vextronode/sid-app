/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import {
  createFamily,
  deleteFamily,
  getFamilies,
  updateFamily,
} from '../api'

export function useFamilyList() {
  const [families, setFamilies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const loadFamilies = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getFamilies({
        page: currentPage,
        ...(search ? { search } : {}),
      })
      const result = response.data?.data
      setFamilies(Array.isArray(result) ? result : [])
      setTotalPages(response.data?.meta?.last_page ?? 1)
      setTotalItems(response.data?.meta?.total ?? (Array.isArray(result) ? result.length : 0))
    } catch (err) {
      setError(err?.response?.data?.message || 'Gagal memuat data kartu keluarga.')
    } finally {
      setLoading(false)
    }
  }, [currentPage, search])

  useEffect(() => {
    loadFamilies()
  }, [loadFamilies])

  const searchFamilies = (value) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const addFamily = async (payload) => {
    await createFamily(payload)
    await loadFamilies()
  }

  const editFamily = async (id, payload) => {
    await updateFamily(id, payload)
    await loadFamilies()
  }

  const removeFamily = async (id) => {
    await deleteFamily(id)
    await loadFamilies()
  }

  return {
    families,
    loading,
    error,
    totalItems,
    searchFamilies,
    currentPage,
    setCurrentPage,
    totalPages,
    addFamily,
    editFamily,
    removeFamily,
    reload: loadFamilies,
  }
}
