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
  return error.response?.data?.message ?? null
}

const getValidationErrors = (error) => {
  return error.response?.data?.errors ?? {}
}

const isNetworkError = (error) => {
  return (
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNABORTED' ||
    error.message === 'Network Error'
  )
}

const isServerError = (status) => {
  return typeof status === 'number' && status >= 500
}

function getRateLimitMessage(error) {
  const response = error.response
  const rawRetryAfter = response?.headers?.['retry-after'] ?? response?.data?.retry_after
  const retrySeconds = Number(rawRetryAfter)
  const retryDate = typeof rawRetryAfter === 'string' ? Date.parse(rawRetryAfter) : Number.NaN
  const retryAfter = Number.isFinite(retrySeconds) && retrySeconds > 0
    ? retrySeconds
    : Number.isFinite(retryDate)
      ? Math.max(Math.ceil((retryDate - Date.now()) / 1000), 0)
      : 0

  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    const minutes = Math.ceil(retryAfter / 60)
    const wait = minutes >= 60 ? `${Math.ceil(minutes / 60)} jam` : `${minutes} menit`

    return `${response.data?.message ?? 'Terlalu banyak percobaan login.'} Akses login ditangguhkan sementara hingga ${wait}.`
  }

  return `${response?.data?.message ?? 'Terlalu banyak percobaan login.'} Akses login ditangguhkan sementara hingga 1 jam.`
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
        throw new Error('Login berhasil, tetapi data user tidak lengkap.')
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
      // VALIDATION / CREDENTIAL / LOCKOUT
      // Backend:
      // 422 ValidationException
      // errors.username
      // ==========================================

      if (status === 422) {
        const usernameError = backendErrors.username?.[0] ?? ''
        const passwordError = backendErrors.password?.[0] ?? ''

        setErrors({
          username: usernameError,
          password: passwordError,
          general:
            usernameError ||
            passwordError ||
            backendMessage ||
            'Username atau password belum sesuai.',
        })

        return null
      }

      // ==========================================
      // ACCOUNT INACTIVE
      // Backend:
      // abort(403, 'Akun tidak aktif, hubungi administrator')
      // ==========================================

      if (status === 403) {
        setErrors({
          ...INITIAL_ERRORS,
          general:
            backendMessage ||
            'Akun tidak dapat digunakan. Silakan hubungi administrator.',
        })

        return null
      }

      if (status === 429) {
        setErrors({
          ...INITIAL_ERRORS,
          general: getRateLimitMessage(error),
        })

        return null
      }

      // ==========================================
      // CSRF / SESSION ERROR
      // ==========================================

      if (status === 419) {
        setErrors({
          ...INITIAL_ERRORS,
          general:
            backendMessage ||
            'Sesi keamanan tidak valid. Silakan coba login kembali.',
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
      // SERVER ERROR
      // ==========================================

      if (isServerError(status)) {
        setErrors({
          ...INITIAL_ERRORS,
          general:
            'Terjadi gangguan pada server. Silakan coba lagi beberapa saat.',
        })

        return null
      }

      // ==========================================
      // NETWORK ERROR
      // ==========================================

      if (isNetworkError(error)) {
        setErrors({
          ...INITIAL_ERRORS,
          general:
            'Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.',
        })

        return null
      }

      // ==========================================
      // UNKNOWN ERROR
      // ==========================================

      setErrors({
        ...INITIAL_ERRORS,
        general:
          backendMessage ||
          'Terjadi kesalahan saat login. Silakan coba lagi.',
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