/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'

import { getSuratDetail } from '@/features/approval/api'
import { ROLE_KEY } from '../constants/roleConfigKades'

export function useSuratDetail(id) {
  const [surat, setSurat] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const fetchDetail = async () => {
    if (!id) {
      return
    }

    try {
      setIsLoading(true)

      const response = await getSuratDetail(id, ROLE_KEY)

      console.log('KADES DETAIL SURAT:', response.data?.data)
      console.log('KADES APPROVALS:', response.data?.data?.approvals)
      setSurat(response.data?.data ?? null)
      setNotFound(false)
    } catch (error) {
      console.error('GET KADES DETAIL ERROR:', error.response?.data ?? error)

      setSurat(null)
      setNotFound(error.response?.status === 404)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
  }, [id])

  return {
    surat,
    isLoading,
    notFound,
    refresh: fetchDetail,
  }
}
