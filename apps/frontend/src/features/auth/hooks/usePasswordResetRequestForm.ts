// ==========================================
// usePasswordResetRequestForm.ts
// Lupa kata sandi tanpa email: NIK + tanggal lahir, disetujui Staf SIDUTama.
// Token klaim disimpan di localStorage supaya pengaju bisa tutup tab dan
// kembali lagi untuk cek status / membuat kata sandi baru.
// ==========================================

import { useCallback, useEffect, useState } from 'react'

import api from '@/lib/api'
import { alertDialog } from '@/shared/lib/dialog'
import { apiErrorBody, apiErrorStatus } from '@/shared/lib/apiError'
import type { IsoDateString } from '@/types'

const STORAGE_KEY = 'sid_password_reset_token'

// Status dari sisi pengaju (PasswordResetRequestStatusResource).
export type PasswordResetClaimStatus =
  'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'expired'

export type PasswordResetClaim = {
  status: PasswordResetClaimStatus
  name: string | null
  username: string | null
  created_at: IsoDateString | null
  approved_until?: IsoDateString | null
  response_notes: string | null
}

// 'form': belum ada token. 'status': menunggu/ditolak/kedaluwarsa.
// 'ready': disetujui, boleh membuat kata sandi. 'done': selesai.
export type PasswordResetStage = 'form' | 'status' | 'ready' | 'done'

const INITIAL_FORM = { nik: '', date_of_birth: '' }
const INITIAL_FORM_ERRORS = { nik: '', date_of_birth: '', general: '' }
const INITIAL_PASSWORD_FORM = { password: '', password_confirmation: '' }
const INITIAL_PASSWORD_ERRORS = { password: '', password_confirmation: '', general: '' }

type FieldEvent = { target: { name: string; value: string } }
type SubmitEvent = { preventDefault: () => void }

function readStoredToken(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEY, token)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Penyimpanan diblokir (mode privat): alur tetap jalan selama tab terbuka.
  }
}

function backendMessage(error: unknown, fallback: string): string {
  return apiErrorBody(error)?.message ?? fallback
}

export function usePasswordResetRequestForm() {
  const [token, setToken] = useState(readStoredToken)

  const [stage, setStage] = useState<PasswordResetStage>(token ? 'status' : 'form')
  const [statusData, setStatusData] = useState<PasswordResetClaim | null>(null)

  const [formData, setFormData] = useState(INITIAL_FORM)
  const [formErrors, setFormErrors] = useState(INITIAL_FORM_ERRORS)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [passwordForm, setPasswordForm] = useState(INITIAL_PASSWORD_FORM)
  const [passwordErrors, setPasswordErrors] = useState(INITIAL_PASSWORD_ERRORS)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [statusError, setStatusError] = useState('')

  const handleChange = (event: FieldEvent) => {
    const { name, value } = event.target
    const nextValue = name === 'nik' ? value.replace(/\D/g, '').slice(0, 16) : value

    setFormData((previous) => ({ ...previous, [name]: nextValue }))
    setFormErrors((previous) => ({ ...previous, [name]: '', general: '' }))
  }

  const handlePasswordChange = (event: FieldEvent) => {
    const { name, value } = event.target

    setPasswordForm((previous) => ({ ...previous, [name]: value }))
    setPasswordErrors((previous) => ({ ...previous, [name]: '', general: '' }))
  }

  const checkStatus = useCallback(async (claimToken: string) => {
    setIsCheckingStatus(true)
    setStatusError('')

    try {
      const response = await api.post<{ data: PasswordResetClaim }>(
        '/password-reset-requests/status',
        { token: claimToken },
      )
      const data = response.data?.data ?? null

      setStatusData(data)
      setStage(data?.status === 'approved' ? 'ready' : 'status')

      return data
    } catch (error) {
      if (apiErrorStatus(error) === 404) {
        // Token sudah tidak berlaku (mis. digantikan pengajuan baru di
        // perangkat lain): kembali ke form, bukan dianggap error.
        writeStoredToken(null)
        setToken('')
        setStage('form')

        return null
      }

      setStatusError(backendMessage(error, 'Gagal memuat status permintaan.'))

      return null
    } finally {
      setIsCheckingStatus(false)
    }
  }, [])

  // Saat halaman dibuka dengan token tersimpan, langsung cek status terkini.
  useEffect(() => {
    if (token && stage !== 'done') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void checkStatus(token)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const validateRequestForm = () => {
    const nextErrors = { ...INITIAL_FORM_ERRORS }

    if (!formData.nik) {
      nextErrors.nik = 'NIK wajib diisi.'
    } else if (formData.nik.length !== 16) {
      nextErrors.nik = 'NIK harus terdiri dari 16 digit.'
    }

    if (!formData.date_of_birth) {
      nextErrors.date_of_birth = 'Tanggal lahir wajib diisi.'
    }

    setFormErrors(nextErrors)

    const messages = Object.values(nextErrors).filter(Boolean)

    if (messages.length > 0) {
      alertDialog({ title: 'Data belum lengkap', message: messages.join('\n'), tone: 'warning' })
    }

    return messages.length === 0
  }

  const submitRequest = async (event: SubmitEvent) => {
    event.preventDefault()

    if (isSubmitting || !validateRequestForm()) {
      return
    }

    setIsSubmitting(true)
    setFormErrors(INITIAL_FORM_ERRORS)

    try {
      await api.get('/sanctum/csrf-cookie')

      const response = await api.post<{ data: PasswordResetClaim; token: string }>(
        '/password-reset-requests',
        formData,
      )
      const newToken = response.data?.token ?? ''

      writeStoredToken(newToken)
      setToken(newToken)
      setStatusData(response.data?.data ?? null)
      setStage('status')
    } catch (error) {
      const status = apiErrorStatus(error)
      const backendErrors = apiErrorBody(error)?.errors ?? {}

      if (status === 422) {
        setFormErrors({
          nik: backendErrors.nik?.[0] ?? '',
          date_of_birth: backendErrors.date_of_birth?.[0] ?? '',
          general: backendMessage(error, 'NIK atau tanggal lahir tidak cocok dengan data kami.'),
        })

        return
      }

      const fallback =
        status === 403
          ? 'Permintaan ini tidak dapat diproses untuk akun Anda.'
          : status === 419
            ? 'Sesi keamanan tidak valid. Silakan coba lagi.'
            : status === 429
              ? 'Terlalu banyak percobaan. Silakan coba lagi nanti.'
              : 'Pengajuan gagal dikirim. Silakan coba lagi.'

      setFormErrors({ ...INITIAL_FORM_ERRORS, general: backendMessage(error, fallback) })
    } finally {
      setIsSubmitting(false)
    }
  }

  const validatePasswordForm = () => {
    const nextErrors = { ...INITIAL_PASSWORD_ERRORS }

    if (!passwordForm.password) {
      nextErrors.password = 'Kata sandi wajib diisi.'
    }

    if (!passwordForm.password_confirmation) {
      nextErrors.password_confirmation = 'Konfirmasi kata sandi wajib diisi.'
    } else if (passwordForm.password !== passwordForm.password_confirmation) {
      nextErrors.password_confirmation = 'Konfirmasi kata sandi tidak cocok.'
    }

    setPasswordErrors(nextErrors)

    return !nextErrors.password && !nextErrors.password_confirmation
  }

  const completeReset = async (event: SubmitEvent) => {
    event.preventDefault()

    if (isCompleting || !validatePasswordForm()) {
      return
    }

    setIsCompleting(true)
    setPasswordErrors(INITIAL_PASSWORD_ERRORS)

    try {
      await api.get('/sanctum/csrf-cookie')
      await api.post('/password-reset-requests/complete', { token, ...passwordForm })

      writeStoredToken(null)
      setStage('done')
    } catch (error) {
      const status = apiErrorStatus(error)
      const backendErrors = apiErrorBody(error)?.errors ?? {}

      if (status === 422) {
        setPasswordErrors({
          password: backendErrors.password?.[0] ?? '',
          password_confirmation: backendErrors.password_confirmation?.[0] ?? '',
          general: backendMessage(error, 'Kata sandi belum memenuhi persyaratan.'),
        })

        return
      }

      // 409 (sudah tidak berlaku) atau 403 (akun nonaktif): segarkan status
      // supaya pengaju melihat kondisi terkini, bukan terjebak di form.
      if (status === 409 || status === 403) {
        await checkStatus(token)

        setPasswordErrors({
          ...INITIAL_PASSWORD_ERRORS,
          general: backendMessage(error, 'Permintaan ini sudah tidak berlaku.'),
        })

        return
      }

      setPasswordErrors({
        ...INITIAL_PASSWORD_ERRORS,
        general: backendMessage(error, 'Kata sandi gagal dibuat. Silakan coba lagi.'),
      })
    } finally {
      setIsCompleting(false)
    }
  }

  // Pengaju memilih mengajukan lagi (mis. setelah ditolak/kedaluwarsa).
  const startOver = () => {
    writeStoredToken(null)
    setToken('')
    setStatusData(null)
    setFormData(INITIAL_FORM)
    setFormErrors(INITIAL_FORM_ERRORS)
    setStage('form')
  }

  return {
    stage,
    statusData,
    statusError,
    isCheckingStatus,
    refreshStatus: () => checkStatus(token),
    startOver,

    formData,
    formErrors,
    isSubmitting,
    handleChange,
    submitRequest,

    passwordForm,
    passwordErrors,
    isCompleting,
    showPassword,
    showPasswordConfirmation,
    handlePasswordChange,
    completeReset,
    togglePassword: () => setShowPassword((value) => !value),
    togglePasswordConfirmation: () => setShowPasswordConfirmation((value) => !value),
  }
}
