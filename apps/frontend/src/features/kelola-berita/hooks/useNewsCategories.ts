import { useCallback, useEffect, useState } from 'react'
import {
  createNewsCategory,
  deleteNewsCategory,
  getNewsCategories,
  updateNewsCategory,
} from '@/features/kelola-berita/api'
import type { NewsCategory } from '@/types'

// Kategori berita desa. Setiap perubahan memuat ulang daftar agar
// news_count dan can_delete dari server selalu mutakhir.
export function useNewsCategories() {
  const [categories, setCategories] = useState<NewsCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const fetchCategories = useCallback(async () => {
    try {
      const response = await getNewsCategories()
      setCategories(response?.data?.data ?? [])
    } catch (error) {
      console.error('GET KATEGORI BERITA ERROR:', error)
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

  const run = async (request: () => Promise<unknown>) => {
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
    addCategory: (name: string) => run(() => createNewsCategory(name)),
    renameCategory: (id: number, name: string) => run(() => updateNewsCategory(id, name)),
    removeCategory: (id: number) => run(() => deleteNewsCategory(id)),
    refreshCategories: fetchCategories,
  }
}
