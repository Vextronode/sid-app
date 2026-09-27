/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from 'react'

import { getSuratList } from '@/features/approval/api'
import { RELEVANT_STATUSES } from '@/constants/suratStatus'

export function useSuratList({ initialStatus = '' } = {}) {
  const [letters, setLetters] = useState([])
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [filterJenis, setFilterJenis] = useState('')
  const [filterStatus, setFilterStatus] = useState(initialStatus)

  // ==========================================
  // AMBIL DATA SURAT KADES
  // ==========================================

  const fetchLetters = async () => {
    try {
      setLoading(true)

      const response = await getSuratList('kepala_desa')

      setLetters(Array.isArray(response.data?.data) ? response.data.data : [])
    } catch (error) {
      console.error('GET KADES LETTER ERROR:', error.response?.data ?? error)

      setLetters([])
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    fetchLetters()
  }, [])

  // ==========================================
  // FILTER DATA
  // ==========================================

  const data = useMemo(() => {
    let result = [...letters]

    // ========================================
    // STATUS GENERIK
    // ========================================

    result = result.filter((letter) => RELEVANT_STATUSES.includes(letter.status))

    // ========================================
    // FILTER JENIS SURAT
    // ========================================

    if (filterJenis) {
      result = result.filter((letter) => letter.letter_type?.name === filterJenis)
    }

    // ========================================
    // FILTER STATUS
    // ========================================

    if (filterStatus) {
      result = result.filter((letter) => letter.status === filterStatus)
    }

    // ========================================
    // SEARCH
    // ========================================

    const keyword = search.trim().toLowerCase()

    if (keyword) {
      result = result.filter((letter) => {
        const letterNumber = String(letter.letter_number ?? '').toLowerCase()

        const applicantName = String(
          letter.applicant_name ?? letter.citizen?.name ?? '',
        ).toLowerCase()

        return letterNumber.includes(keyword) || applicantName.includes(keyword)
      })
    }

    return result
  }, [letters, filterJenis, filterStatus, search])

  // ==========================================
  // RETURN
  // ==========================================

  return {
    data,

    loading,

    search,
    setSearch,

    filterJenis,
    setFilterJenis,

    filterStatus,
    setFilterStatus,

    refresh: fetchLetters,
  }
}
