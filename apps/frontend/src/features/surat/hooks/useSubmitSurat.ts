import { useState } from 'react'
import { submitSurat } from '../api/suratApi'

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
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {})
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
