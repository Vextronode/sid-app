import { useCallback, useEffect, useState } from 'react'
import {
  createNewsCategory,
  deleteNewsCategory,
  getNewsCategories,
  updateNewsCategory,
} from '@/features/kelola-berita/api'

// Kategori berita desa. Setiap perubahan memuat ulang daftar agar
// news_count dan can_delete dari server selalu mutakhir.
export function useNewsCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const fetchCategories = useCallback(async () => {
    try {
      const response = await getNewsCategories()
      setCategories(response?.data?.data ?? [])
    } catch (error) {
      console.error('GET KATEGORI BERITA ERROR:', error.response?.status, error.response?.data)
      setCategories([])
    }
  }, [])

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await fetchCategories()
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [fetchCategories])

  const run = async (request) => {
    setProcessing(true)

    try {
      await request()
      await fetchCategories()
    } finally {
      setProcessing(false)
    }
  }

  return {
    categories,
    loading,
    processing,
    addCategory: (name) => run(() => createNewsCategory(name)),
    renameCategory: (id, name) => run(() => updateNewsCategory(id, name)),
    removeCategory: (id) => run(() => deleteNewsCategory(id)),
    refreshCategories: fetchCategories,
  }
}

// Pesan error dari respons 409/422 Laravel, untuk ditampilkan di form.
export function categoryErrorMessage(error, fallback) {
  const data = error?.response?.data
  const firstFieldError = Object.values(data?.errors ?? {})[0]?.[0]

  return firstFieldError ?? data?.message ?? fallback
}
