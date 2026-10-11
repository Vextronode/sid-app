import { useMemo, useState } from 'react'

import { RELEVANT_STATUSES } from '@/constants/suratStatus'
import { useSuratListQuery } from '@/features/surat/hooks/useSuratListQuery'

export function useApprovalLetterList({ initialStatus = '' } = {}) {
  const { letters, loading, refresh } = useSuratListQuery()

  const [search, setSearch] = useState('')
  const [filterJenis, setFilterJenis] = useState('')
  const [filterStatus, setFilterStatus] = useState(initialStatus)

  const data = useMemo(() => {
    let result = letters.filter((letter) => RELEVANT_STATUSES.includes(letter.status))

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
    refresh,
  }
}
