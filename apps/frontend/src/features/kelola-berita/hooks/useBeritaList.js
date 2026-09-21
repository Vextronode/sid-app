import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createBerita,
  deleteBerita as deleteBeritaApi,
  getBeritaList,
  publishBerita as publishBeritaApi,
  updateBerita,
} from '@/features/kelola-berita/api'

const ITEMS_PER_PAGE = 6

export function useBeritaList() {
  const [berita, setBerita] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [processing, setProcessing] = useState(false)
  const [loading, setLoading] = useState(true)

  // ==========================================
  // AMBIL SEMUA DATA BERITA DARI BACKEND
  // ==========================================

  const fetchBerita = useCallback(async () => {
    try {
      const firstResponse = await getBeritaList({
        page: 1,
      })

      const firstResponseData = firstResponse?.data
      const firstData = firstResponseData?.data ?? []
      const lastPage = firstResponseData?.meta?.last_page ?? 1

      // Kalau cuma 1 halaman
      if (lastPage === 1) {
        setBerita(firstData)

        return
      }

      // Ambil halaman berikutnya
      const requests = []

      for (let page = 2; page <= lastPage; page += 1) {
        requests.push(
          getBeritaList({
            page,
          }),
        )
      }

      const responses = await Promise.all(requests)

      const remainingData = responses.flatMap((response) => response?.data?.data ?? [])

      setBerita([...firstData, ...remainingData])
    } catch (error) {
      console.error('GET BERITA ERROR:', {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
      })

      setBerita([])
    }
  }, [])

  // ==========================================
  // LOAD BERITA PERTAMA KALI
  // ==========================================

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await fetchBerita()
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [fetchBerita])

  // ==========================================
  // TOTAL PAGE FRONTEND
  // ==========================================

  const totalPages = Math.max(1, Math.ceil(berita.length / ITEMS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  // ==========================================
  // REMOVE BERITA
  // ==========================================

  const removeBerita = async (id) => {
    setProcessing(true)

    try {
      await deleteBeritaApi(id)
      await fetchBerita()
    } finally {
      setProcessing(false)
    }
  }

  // ==========================================
  // DATA YANG DITAMPILKAN DI HALAMAN AKTIF
  // ==========================================

  const data = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE

    const endIndex = startIndex + ITEMS_PER_PAGE

    return berita.slice(startIndex, endIndex)
  }, [berita, safeCurrentPage])

  // ==========================================
  // BERITA UTAMA
  // ==========================================

  const beritaUtama = useMemo(() => {
    return berita[0] ?? null
  }, [berita])

  // ==========================================
  // BERITA TERBARU
  // ==========================================

  const beritaTerbaru = useMemo(() => {
    return berita.slice(1, 5)
  }, [berita])

  // ==========================================
  // TAMBAH BERITA
  // ==========================================

  const addBerita = async (payload) => {
    setProcessing(true)

    try {
      await createBerita(payload)

      setCurrentPage(1)

      await fetchBerita()
    } finally {
      setProcessing(false)
    }
  }

  // ==========================================
  // UPDATE BERITA
  // ==========================================

  const updateBeritaData = async (id, payload) => {
    setProcessing(true)

    try {
      await updateBerita(id, payload)

      await fetchBerita()
    } finally {
      setProcessing(false)
    }
  }

  // ==========================================
  // PUBLISH BERITA
  // ==========================================

  const publishBerita = async (id) => {
    setProcessing(true)

    try {
      await publishBeritaApi(id)

      await fetchBerita()
    } finally {
      setProcessing(false)
    }
  }

  return {
    beritaUtama,
    beritaTerbaru,

    // Data yang khusus untuk grid halaman aktif
    data,

    currentPage,
    setCurrentPage,
    totalPages,

    addBerita,
    updateBerita: updateBeritaData,
    publishBerita,
    deleteBerita: removeBerita,

    processing,
    loading,
  }
}
