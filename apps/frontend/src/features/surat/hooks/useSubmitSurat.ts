import { useState } from 'react'
import { submitSurat } from '../api/suratApi'
import { apiErrorStatus, apiErrorBody } from '@/shared/lib/apiError'

export function useSubmitSurat() {
  const [loading, setLoading] = useState(false)
  // Galat validasi 422 per nama isian.
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess] = useState('')

  const handleSubmit = async (formData: FormData) => {
    try {
      setLoading(true)
      setErrors({})
      setSuccess('')

      const data = await submitSurat(formData)

      setSuccess(data.message)

      return data
    } catch (err) {
      if (apiErrorStatus(err) === 422) {
        setErrors(apiErrorBody(err)?.errors ?? {})
      }

      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    errors,
    success,
    handleSubmit,
  }
}
