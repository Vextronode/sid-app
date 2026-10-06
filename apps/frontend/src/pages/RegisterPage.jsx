// ==========================================
// RegisterPage.jsx
// Registrasi akun warga - Backend v5.1
// NIK + Password
// Username dibuat otomatis oleh backend
// User wajib login manual setelah register
// ==========================================

import { Link, useNavigate } from 'react-router-dom'

import {
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Landmark,
  Lock,
  UserPlus,
} from 'lucide-react'

import { useRegisterForm } from '@/features/auth/hooks/useRegisterForm'

export default function RegisterPage() {
  const navigate = useNavigate()

  const {
    formData,
    errors,
    isLoading,
    isSuccess,
    registeredUsername,
    showPassword,
    showPasswordConfirmation,
    handleChange,
    handleSubmit,
    togglePassword,
    togglePasswordConfirmation,
  } = useRegisterForm()

  if (isSuccess) {
    return (
      <div className="sid-login">
        <div className="sid-login-card">
          <div className="sid-login-logo">
            <CheckCircle2 size={24} />
          </div>

          <div className="sid-login-header">
            <h1 className="sid-login-title">
              Pendaftaran Berhasil
            </h1>

            <p className="sid-login-description">
              Akun warga berhasil dibuat.
              Silakan login untuk mulai menggunakan sistem.
            </p>
          </div>

          {registeredUsername && (
            <div className="sid-register-username">
              <span className="sid-register-username-label">
                Username Anda
              </span>

              <strong>
                {registeredUsername}
              </strong>
            </div>
          )}

          {!registeredUsername && (
            <div className="sid-register-success-info">
              Username telah dibuat otomatis oleh sistem.
              Silakan login menggunakan username Anda.
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              navigate('/login', {
                replace: true,
              })
            }
            className="sid-login-submit"
          >
            <span>
              Masuk ke Halaman Login
            </span>

            <UserPlus size={16} />
          </button>

          <div className="sid-login-footer">
            <p className="sid-login-copyright">
              Desa Cibenda · Kec. Parigi · Kab. Pangandaran · © 2026
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sid-login">
      <div className="sid-login-card">
        <div className="sid-login-logo">
          <Landmark size={24} />
        </div>

        <div className="sid-login-header">
          <h1 className="sid-login-title">
            Daftar Akun Warga
          </h1>

          <p className="sid-login-description">
            Buat akun menggunakan NIK dan password Anda
          </p>
        </div>

        {errors.general && (
          <div className="sid-login-error">
            {errors.general}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="sid-login-form"
        >
          {/* NIK */}
          <div className="sid-login-field">
            <label className="sid-login-label">
              Nomor Induk Kependudukan (NIK)
            </label>

            <div className="sid-login-input-wrapper">
              <CreditCard
                size={16}
                className="sid-login-input-icon"
              />

              <input
                type="text"
                name="nik"
                value={formData.nik}
                onChange={handleChange}
                maxLength={16}
                inputMode="numeric"
                autoComplete="username"
                placeholder="Masukkan 16 digit NIK"
                className={`sid-login-input sid-login-input-with-left-icon ${
                  errors.nik
                    ? 'sid-login-input-error'
                    : ''
                }`}
              />
            </div>

            {errors.nik && (
              <span className="sid-login-field-error">
                {errors.nik}
              </span>
            )}
          </div>

          {/* PASSWORD */}
          <div className="sid-login-field">
            <label className="sid-login-label">
              Password
            </label>

            <div className="sid-login-input-wrapper">
              <Lock
                size={16}
                className="sid-login-input-icon"
              />

              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                name="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                placeholder="Masukkan password"
                className={`sid-login-input sid-login-input-password ${
                  errors.password
                    ? 'sid-login-input-error'
                    : ''
                }`}
              />

              <button
                type="button"
                onClick={togglePassword}
                className="sid-login-password-toggle"
                aria-label={
                  showPassword
                    ? 'Sembunyikan password'
                    : 'Tampilkan password'
                }
              >
                {showPassword ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>

            {errors.password && (
              <span className="sid-login-field-error">
                {errors.password}
              </span>
            )}
          </div>

          {/* PASSWORD CONFIRMATION */}
          <div className="sid-login-field">
            <label className="sid-login-label">
              Konfirmasi Password
            </label>

            <div className="sid-login-input-wrapper">
              <Lock
                size={16}
                className="sid-login-input-icon"
              />

              <input
                type={
                  showPasswordConfirmation
                    ? 'text'
                    : 'password'
                }
                name="password_confirmation"
                value={formData.password_confirmation}
                onChange={handleChange}
                autoComplete="new-password"
                placeholder="Ulangi password"
                className={`sid-login-input sid-login-input-password ${
                  errors.password_confirmation
                    ? 'sid-login-input-error'
                    : ''
                }`}
              />

              <button
                type="button"
                onClick={togglePasswordConfirmation}
                className="sid-login-password-toggle"
                aria-label={
                  showPasswordConfirmation
                    ? 'Sembunyikan konfirmasi password'
                    : 'Tampilkan konfirmasi password'
                }
              >
                {showPasswordConfirmation ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>

            {errors.password_confirmation && (
              <span className="sid-login-field-error">
                {errors.password_confirmation}
              </span>
            )}
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={isLoading}
            className="sid-login-submit"
          >
            <span>
              {isLoading
                ? 'Mendaftarkan...'
                : 'Daftar Sekarang'}
            </span>

            <UserPlus size={16} />
          </button>
        </form>

        <div className="sid-login-footer">
          <p className="sid-login-register-text">
            Sudah punya akun?

            <Link
              to="/login"
              className="sid-login-register-button"
            >
              Masuk di sini
            </Link>
          </p>

          <p className="sid-login-copyright">
            Desa Cibenda · Kec. Parigi · Kab. Pangandaran · © 2026
          </p>
        </div>
      </div>
    </div>
  )
}