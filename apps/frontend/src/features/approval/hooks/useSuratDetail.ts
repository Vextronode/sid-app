import { useCallback, useEffect, useState } from 'react'

import { getSuratDetail } from '@/lib/api'
import type { ApiError, Id, Letter } from '@/types'

/**
 * Detail surat untuk modal approver dan pemantau (RT, RW, Kadus, Kades/Sekdes).
 * Scope surat ditentukan backend dari sesi pengguna. `refresh` memuat ulang
 * detail, mis. setelah keputusan atau saat keputusan ditolak 409.
 */
export function useSuratDetail(id: Id | null) {
  const [surat, setSurat] = useState<Letter | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(id))
  const [notFound, setNotFound] = useState(false)

  // isActive: false bila id sudah berganti atau komponen dilepas selama memuat.
  const load = useCallback(
    async (isActive: () => boolean = () => true) => {
      if (!id) return

      setIsLoading(true)

      try {
        const response = await getSuratDetail(id)
        if (!isActive()) return

        setSurat(response.data?.data ?? null)
        setNotFound(false)
      } catch (requestError) {
        if (!isActive()) return

        const error = requestError as ApiError
        console.error('DETAIL SURAT ERROR', error.response?.data ?? error)

        if (error.response?.status === 404) {
          setSurat(null)
          setNotFound(true)
        }
      } finally {
        if (isActive()) setIsLoading(false)
      }
    },
    [id],
  )

  useEffect(() => {
    let active = true
    // Memuat detail saat id berganti: state disinkronkan dengan data server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(() => active)

    return () => {
      active = false
    }
  }, [load])

  const refresh = useCallback(() => load(), [load])

  return { surat, isLoading, notFound, refresh }
}
