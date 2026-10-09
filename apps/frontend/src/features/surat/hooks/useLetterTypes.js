import { useEffect, useState } from 'react'
import { getLetterTypes } from '../api/letterTypeApi'

export function useLetterTypes() {
  const [letterTypes, setLetterTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getLetterTypes()
      .then((types) => {
        if (active) setLetterTypes(Array.isArray(types) ? types : [])
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError?.response?.data?.message || 'Gagal memuat konfigurasi jenis surat.',
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return { letterTypes, loading, error }
}