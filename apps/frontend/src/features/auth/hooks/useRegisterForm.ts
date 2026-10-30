// ==========================================
// useRegisterForm.ts
// Logic registrasi akun warga - Backend v5.1
// ==========================================

import { useState } from 'react'

import api from '@/lib/api'
import { alertDialog } from '@/shared/lib/dialog'

const INITIAL_FORM = {
  nik: '',
  date_of_birth: '',
  password: '',
  password_confirmation: '',
}

const INITIAL_ERRORS = {
  nik: '',
  date_of_birth: '',
  password: '',
  password_confirmation: '',
  general: '',
}

export function useRegisterForm() {
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState(INITIAL_ERRORS)

  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const [registeredUsername, setRegisteredUsername] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target

    const nextValue = name === 'nik' ? value.replace(/\D/g, '').slice(0, 16) : value

    setFormData((previous) => ({
      ...previous,
      [name]: nextValue,
    }))

    setErrors((previous) => ({
      ...previous,
      [name]: '',
      general: '',
    }))
  }

  const validate = () => {
    const nextErrors = {
      ...INITIAL_ERRORS,
    }

    if (!formData.nik) {
      nextErrors.nik = 'NIK wajib diisi.'
    } else if (formData.nik.length !== 16) {
      nextErrors.nik = 'NIK harus terdiri dari 16 digit.'
    }

    if (!formData.date_of_birth) {
      nextErrors.date_of_birth = 'Tanggal lahir wajib diisi.'
    }

    if (!formData.password) {
      nextErrors.password = 'Kata sandi wajib diisi.'
    }

    if (!formData.password_confirmation) {
      nextErrors.password_confirmation = 'Konfirmasi kata sandi wajib diisi.'
    } else if (formData.password !== formData.password_confirmation) {
      nextErrors.password_confirmation = 'Konfirmasi kata sandi tidak cocok.'
    }

    setErrors(nextErrors)

    const messages = Object.values(nextErrors).filter(Boolean)

    // Peringatan juga tampil sebagai kartu di tengah layar.
    if (messages.length > 0) {
      const empty = messages.filter((message) => message.endsWith('wajib diisi.'))

      alertDialog({
        title: empty.length > 0 ? 'Data belum lengkap' : 'Periksa kembali data Anda',
        message: messages.join('\n'),
        tone: 'warning',
      })
    }

    return messages.length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isLoading) {
      return
    }

    setErrors(INITIAL_ERRORS)
    setIsSuccess(false)

    if (!validate()) {
      return
    }

    setIsLoading(true)

    try {
      // 1. CSRF
      await api.get('/sanctum/csrf-cookie')

      // 2. Register
      const response = await api.post('/register', {
        nik: formData.nik,
        date_of_birth: formData.date_of_birth,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
      })

      const registeredUser = response.data?.user ?? response.data?.data ?? null

      const username =
        registeredUser?.username ?? response.data?.username ?? response.data?.data?.username ?? ''

      // 3. Tampilkan hasil registrasi.
      setRegisteredUsername(username)
      setIsSuccess(true)
    } catch (error) {
      const status = error.response?.status

      const backendErrors = error.response?.data?.errors ?? {}

      const backendMessage = error.response?.data?.message

      if (status === 422) {
        setErrors({
          nik: backendErrors.nik?.[0] ?? '',
          date_of_birth: backendErrors.date_of_birth?.[0] ?? '',
          password: backendErrors.password?.[0] ?? '',
          password_confirmation: backendErrors.password_confirmation?.[0] ?? '',
          general: backendMessage ?? 'Data pendaftaran belum sesuai.',
        })

        return
      }

      if (status === 409) {
        setErrors((previous) => ({
          ...previous,
          general: backendMessage ?? 'NIK sudah memiliki akun.',
        }))

        return
      }

      if (status === 419) {
        setErrors((previous) => ({
          ...previous,
          general: 'Sesi keamanan tidak valid. Silakan coba lagi.',
        }))

        return
      }

      if (status === 429) {
        setErrors((previous) => ({
          ...previous,
          general: backendMessage ?? 'Terlalu banyak percobaan. Silakan coba lagi nanti.',
        }))

        return
      }

      setErrors((previous) => ({
        ...previous,
        general: backendMessage ?? 'Pendaftaran gagal. Silakan coba lagi.',
      }))
    } finally {
      setIsLoading(false)
    }
  }

  return {
    formData,
    errors,
    isLoading,
    isSuccess,
    registeredUsername,

    showPassword,
    showPasswordConfirmation,

    handleChange,
    handleSubmit,

    togglePassword: () => {
      setShowPassword((value) => !value)
    },

    togglePasswordConfirmation: () => {
      setShowPasswordConfirmation((value) => !value)
    },
  }
}
