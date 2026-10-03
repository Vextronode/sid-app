/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSuratList as getApprovalSuratList } from '@/features/approval/api'
import { getSuratList as getLegacySuratList } from '@/lib/api'
import { RELEVANT_STATUSES } from '@/constants/suratStatus'

export function useApprovalLetterList({ role, initialStatus = '' } = {}) {
  const [letters, setLetters] = useState([])
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [filterJenis, setFilterJenis] = useState('')
  const [filterStatus, setFilterStatus] = useState(initialStatus)

  const fetchLetters = useCallback(async () => {
    try {
      setLoading(true)

      const response =
        role === 'kadus' ? await getLegacySuratList('kadus') : await getApprovalSuratList(role)

      setLetters(response.data.data ?? [])
    } catch (error) {
      console.error(`GET ${role?.toUpperCase()} LETTER ERROR`, error.response?.data ?? error)
      setLetters([])
    } finally {
      setLoading(false)
    }
  }, [role])

  useEffect(() => {
    fetchLetters()
  }, [fetchLetters])

  const data = useMemo(() => {
    let result = [...letters]

    result = result.filter((letter) => RELEVANT_STATUSES.includes(letter.status))

    if (filterJenis) {
      result = result.filter((letter) => letter.letter_type?.name === filterJenis)
    }

    if (filterStatus) {
      result = result.filter((letter) => letter.status === filterStatus)
    }

    if (search) {
      const keyword = search.toLowerCase()

      result = result.filter(
        (letter) =>
          letter.applicant_name?.toLowerCase().includes(keyword) ||
          letter.citizen?.name?.toLowerCase().includes(keyword) ||
          letter.letter_number?.toLowerCase().includes(keyword),
      )
    }

    return result
  }, [letters, filterJenis, filterStatus, search])

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
