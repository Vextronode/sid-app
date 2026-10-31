// ==========================================
// ForgotPasswordPage.tsx
// Lupa kata sandi lewat email: backend mengirim tautan reset ke email yang
// terdaftar pada akun. Akun tanpa email meminta reset ke Staf SIDUTama.
// ==========================================

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, Landmark, Mail, MailCheck, RotateCcw } from 'lucide-react'

import api from '@/lib/api'
import { AuthBackToLogin } from '@/features/auth/components/AuthBackToLogin'
import { AuthCopyright } from '@/features/auth/components/AuthCopyright'
import { useAuthBackground } from '@/features/auth/hooks/useAuthBackground'
import { HAL_LUPA_PASSWORD_NIK } from '@/lib/constants/routes'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import type { FormEvent } from 'react'

export default function ForgotPasswordPage() {
  const background = useAuthBackground()

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await api.get('/sanctum/csrf-cookie')
      await api.post('/forgot-password', { email: email.trim() })
      setSent(true)
    } catch (err) {
      setError(
        getApiErrorMessage(err, 'Tautan atur ulang kata sandi gagal dikirim. Coba lagi nanti.'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={background.className} style={background.style}>
      <div className="sid-login-card">
        {sent ? (
          <>
            <div className="sid-login-logo">
              <MailCheck size={24} />
            </div>

            {/* Backend menjawab sama untuk email terdaftar maupun tidak, jadi
                kalimatnya tidak memastikan email benar-benar terkirim. */}
            <div className="sid-login-header" role="status">
              <h1 className="sid-login-title">Periksa Email Anda</h1>

              <p className="sid-login-description">
                Jika <strong>{email.trim()}</strong> terdaftar pada akun aktif, tautan untuk membuat
                kata sandi baru sudah dikirim. Periksa kotak masuk atau folder spam.
              </p>
            </div>

            <button type="button" onClick={() => setSent(false)} className="sid-login-submit">
              <span>Gunakan Email Lain</span>

              <RotateCcw size={16} />
            </button>
          </>
        ) : (
          <>
            <div className="sid-login-logo">
              <Landmark size={24} />
            </div>

            <div className="sid-login-header">
              <h1 className="sid-login-title">Lupa Kata Sandi</h1>

              <p className="sid-login-description">
                Masukkan email yang terdaftar pada akun Anda. Kami akan mengirim tautan untuk
                membuat kata sandi baru.
              </p>
            </div>

            {error && (
              <div className="sid-login-error" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="sid-login-form">
              <div className="sid-login-field">
                <label htmlFor="forgot-email" className="sid-login-label">
                  Email
                </label>

                <div className="sid-login-input-wrapper">
                  <Mail size={16} className="sid-login-input-icon" />

                  <input
                    id="forgot-email"
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="sid-login-input sid-login-input-with-left-icon"
                  />
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="sid-login-submit">
                <span>{isLoading ? 'Mengirim...' : 'Kirim Tautan Atur Ulang'}</span>

                <KeyRound size={16} />
              </button>
            </form>
          </>
        )}

        <div className="sid-login-footer">
          <p className="sid-login-register-text">
            Tidak punya email atau belum mendaftarkannya?
            <Link to={HAL_LUPA_PASSWORD_NIK} className="sid-login-register-button">
              Ajukan dengan NIK
            </Link>
          </p>

          <AuthBackToLogin />

          <AuthCopyright />
        </div>
      </div>
    </div>
  )
}
