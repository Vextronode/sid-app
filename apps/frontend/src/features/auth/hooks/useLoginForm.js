import { useState } from 'react'

import api from '@/lib/api'

const INITIAL_FORM = {
  username: '',
  password: '',
}

const INITIAL_ERRORS = {
  username: '',
  password: '',
  general: '',
}

const getBackendMessage = (error) => {
  const data = error.response?.data

  if (data?.message) {
    return data.message
  }

  return null
}

const getValidationErrors = (error) => {
  return error.response?.data?.errors ?? {}
}

export function useLoginForm() {
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState(INITIAL_ERRORS)
  const [isLoading, setIsLoading] = useState(false)

  // ==========================================
  // CHANGE FIELD
  // ==========================================

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))

    setErrors((previous) => ({
      ...previous,
      [name]: '',
      general: '',
    }))
  }

  // ==========================================
  // LOGIN
  // ==========================================

  const handleSubmit = async (event, onSuccess) => {
    event?.preventDefault()

    if (isLoading) {
      return
    }

    setErrors(INITIAL_ERRORS)

    setIsLoading(true)

    try {
      // ==========================================
      // 1. AMBIL CSRF COOKIE
      // ==========================================

      await api.get('/sanctum/csrf-cookie')

      // ==========================================
      // 2. LOGIN
      // Endpoint backend v5.1:
      // POST /login
      // ==========================================

      const response = await api.post('/login', {
        username: formData.username,
        password: formData.password,
      })

      // ==========================================
      // 3. AMBIL USER DARI RESPONSE
      // ==========================================

      const loggedUser = response.data?.user

      if (!loggedUser?.role) {
        throw new Error(
          'Login berhasil, tetapi data user tidak lengkap.',
        )
      }

      // ==========================================
      // 4. KIRIM USER KE CALLBACK
      // LoginPage menangani AuthContext + redirect
      // ==========================================

      if (typeof onSuccess === 'function') {
        await onSuccess(loggedUser)
      }

      return loggedUser
    } catch (error) {
      const status = error.response?.status
      const backendErrors = getValidationErrors(error)
      const backendMessage = getBackendMessage(error)

      // ==========================================
      // VALIDATION
      // ==========================================

      if (status === 422) {
        setErrors({
          username: backendErrors.username?.[0] ?? '',
          password: backendErrors.password?.[0] ?? '',
          general:
            backendMessage ??
            'Username atau password belum sesuai.',
        })

        return null
      }

      // ==========================================
      // UNAUTHORIZED
      // ==========================================

      if (status === 401) {
        setErrors({
          ...INITIAL_ERRORS,
          general: backendMessage ?? 'Username atau password salah.',
        })

        return null
      }

      // ==========================================
      // TOO MANY REQUESTS / LOCKOUT
      // ==========================================

      if (status === 429) {
        setErrors({
          ...INITIAL_ERRORS,
          general:
            backendMessage ??
            'Terlalu banyak percobaan login. Silakan coba lagi beberapa saat.',
        })

        return null
      }

      // ==========================================
      // METHOD NOT ALLOWED
      // ==========================================

      if (status === 405) {
        setErrors({
          ...INITIAL_ERRORS,
          general: 'Method login tidak sesuai dengan route server.',
        })

        return null
      }

      // ==========================================
      // CSRF
      // ==========================================

      if (status === 419) {
        setErrors({
          ...INITIAL_ERRORS,
          general:
            'Sesi keamanan tidak valid. Silakan coba login kembali.',
        })

        return null
      }

      // ==========================================
      // DEFAULT ERROR
      // ==========================================

      setErrors({
        ...INITIAL_ERRORS,
        general:
          backendMessage ??
          error.message ??
          'Terjadi kesalahan saat login.',
      })

      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    formData,
    errors,
    isLoading,
    handleChange,
    handleSubmit,
  }
}