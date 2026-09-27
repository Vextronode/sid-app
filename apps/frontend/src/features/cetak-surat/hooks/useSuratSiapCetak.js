// ==========================================
// useSuratSiapCetak.js
//
// Dipakai oleh:
// - Petugas Desa
// - Kasi
// - Kaur
//
// Fungsi:
// - Mengambil surat dari API
// - Hanya menampilkan surat dengan status approved
// - Search nama pemohon
// ==========================================

import { useEffect, useMemo, useState } from 'react'

import api from '@/lib/api'
import { SURAT_STATUS } from '@/constants/suratStatus'

export function useSuratSiapCetak() {
  const [letters, setLetters] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  // ==========================================
  // LOAD DATA
  // ==========================================

  const fetchLetters = async () => {
    try {
      setLoading(true)

      const response = await api.get('/api/letters')

      setLetters(Array.isArray(response.data?.data) ? response.data.data : [])
    } catch (error) {
      console.error('GET SURAT SIAP CETAK ERROR:', error.response?.data ?? error)

      setLetters([])
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLetters()
  }, [])

  // ==========================================
  // FILTER SURAT APPROVED
  // ==========================================

  const data = useMemo(() => {
    let result = letters.filter((letter) => letter.status === SURAT_STATUS.APPROVED)

    const keyword = search.trim().toLowerCase()

    if (keyword) {
      result = result.filter((letter) => {
        const applicantName = String(
          letter.applicant_name ?? letter.citizen?.name ?? '',
        ).toLowerCase()

        return applicantName.includes(keyword)
      })
    }

    // Normalisasi data agar CetakSuratListPage
    // tetap menggunakan struktur yang sekarang.
    return result.map((letter) => ({
      ...letter,

      no_surat: letter.no_surat ?? letter.letter_number ?? '-',

      pemohon: letter.pemohon ?? letter.applicant_name ?? letter.citizen?.name ?? '-',

      jenis: letter.jenis ?? letter.letter_type?.name ?? '-',
    }))
  }, [letters, search])

  return {
    data,
    search,
    setSearch,
    loading,
    refresh: fetchLetters,
  }
}
