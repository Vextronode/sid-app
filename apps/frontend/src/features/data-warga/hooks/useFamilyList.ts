/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { usePageSize } from '@/components/ui/usePageSize'
import { createFamily, deleteFamily, getFamilies, getFamilyOptions, updateFamily } from '../api'
import type { Family, FamilyOption, Id } from '@/types'
import { useWilayahFilter } from './useWilayahFilter'
import { getApiErrorMessage } from '@/shared/lib/apiError'

type FamilyPayload = Record<string, unknown>

export function useFamilyList() {
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSizeState] = usePageSize('data-kk')
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  // Pilihan KK di form warga: semua KK, terpisah dari daftar berhalaman.
  const [options, setOptions] = useState<FamilyOption[]>([])
  // Filter bertingkat Dusun -> RW -> RT; mengubahnya kembali ke halaman 1.
  const wilayahFilter = useWilayahFilter(() => setCurrentPage(1))
  const { params: wilayahParams } = wilayahFilter

  const loadFamilies = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getFamilies({
        page: currentPage,
        per_page: pageSize,
        ...(search ? { search } : {}),
        ...wilayahParams,
      })
      const result = response.data?.data
      setFamilies(Array.isArray(result) ? result : [])
      setTotalPages(response.data?.meta?.last_page ?? 1)
      setTotalItems(response.data?.meta?.total ?? (Array.isArray(result) ? result.length : 0))
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal memuat data kartu keluarga.'))
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, search, wilayahParams])

  const loadOptions = useCallback(async () => {
    try {
      const response = await getFamilyOptions()
      const result = response.data?.data
      setOptions(Array.isArray(result) ? result : [])
    } catch {
      setOptions([])
    }
  }, [])

  useEffect(() => {
    loadFamilies()
  }, [loadFamilies])

  useEffect(() => {
    loadOptions()
  }, [loadOptions])

  const reloadAll = () => Promise.all([loadFamilies(), loadOptions()])

  const searchFamilies = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const setPageSize = (value: number) => {
    setPageSizeState(value)
    setCurrentPage(1)
  }

  const addFamily = async (payload: FamilyPayload) => {
    await createFamily(payload)
    await reloadAll()
  }

  const editFamily = async (id: Id, payload: FamilyPayload) => {
    await updateFamily(id, payload)
    await reloadAll()
  }

  const removeFamily = async (id: Id) => {
    await deleteFamily(id)
    await reloadAll()
  }

  return {
    families,
    options,
    loading,
    error,
    totalItems,
    searchFamilies,
    wilayahFilter,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    setPageSize,
    addFamily,
    editFamily,
    removeFamily,
    reload: reloadAll,
  }
}
