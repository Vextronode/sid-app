// ==========================================
// ResetPasswordPage.tsx
// Tujuan tautan reset dari email: /reset-password/:token?email=...
// ==========================================

import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Eye, EyeOff, KeyRound, Lock, LogIn } from 'lucide-react'

import api from '@/lib/api'
import { AuthBackToLogin } from '@/features/auth/components/AuthBackToLogin'
import { AuthCopyright } from '@/features/auth/components/AuthCopyright'
import { useAuthBackground } from '@/features/auth/hooks/useAuthBackground'
import { HAL_LOGIN, HAL_LUPA_PASSWORD } from '@/lib/constants/routes'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import type { FormEvent } from 'react'

export default function ResetPasswordPage() {
  const background = useAuthBackground()
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const isLinkComplete = Boolean(token && email)

  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (password !== confirmation) {
      setError('Konfirmasi kata sandi tidak sama.')
      return
    }

    setIsLoading(true)

    try {
      await api.get('/sanctum/csrf-cookie')
      await api.post('/reset-password', {
        token,
        email,
        password,
        password_confirmation: confirmation,
      })
      setSuccess(true)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Kata sandi gagal diatur ulang.'))
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className={background.className} style={background.style}>
        <div className="sid-login-card">
          <div className="sid-login-logo">
            <CheckCircle2 size={24} />
          </div>

          <div className="sid-login-header" role="status">
            <h1 className="sid-login-title">Kata Sandi Berhasil Diubah</h1>

            <p className="sid-login-description">Silakan login menggunakan kata sandi baru Anda.</p>
          </div>

          <Link to={HAL_LOGIN} replace className="sid-login-submit">
            <span>Masuk ke Halaman Login</span>

            <LogIn size={16} />
          </Link>

          <div className="sid-login-footer">
            <AuthCopyright />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={background.className} style={background.style}>
      <div className="sid-login-card">
        <div className="sid-login-logo">
          <KeyRound size={24} />
        </div>

        <div className="sid-login-header">
          <h1 className="sid-login-title">Buat Kata Sandi Baru</h1>

          <p className="sid-login-description">
            {isLinkComplete ? (
              <>
                Untuk akun <strong>{email}</strong>
              </>
            ) : (
              'Tautan atur ulang tidak lengkap. Minta tautan baru.'
            )}
          </p>
        </div>

        {error && (
          <div className="sid-login-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="sid-login-form">
          <div className="sid-login-field">
            <label htmlFor="reset-password" className="sid-login-label">
              Kata Sandi Baru
            </label>

            <div className="sid-login-input-wrapper">
              <Lock size={16} className="sid-login-input-icon" />

              <input
                id="reset-password"
                required
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="sid-login-input sid-login-input-password"
              />

              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="sid-login-password-toggle"
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="sid-login-field">
            <label htmlFor="reset-password-confirmation" className="sid-login-label">
              Konfirmasi Kata Sandi Baru
            </label>

            <div className="sid-login-input-wrapper">
              <Lock size={16} className="sid-login-input-icon" />

              <input
                id="reset-password-confirmation"
                required
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                className="sid-login-input sid-login-input-with-left-icon"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !isLinkComplete}
            className="sid-login-submit"
          >
            <span>{isLoading ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}</span>

            <KeyRound size={16} />
          </button>
        </form>

        <div className="sid-login-footer">
          <p className="sid-login-register-text">
            Tautan kedaluwarsa atau tidak berlaku?
            <Link to={HAL_LUPA_PASSWORD} className="sid-login-register-button">
              Minta tautan baru
            </Link>
          </p>

          <AuthBackToLogin />

          <AuthCopyright />
        </div>
      </div>
    </div>
  )
}
