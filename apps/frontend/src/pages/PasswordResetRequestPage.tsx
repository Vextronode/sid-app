// ==========================================
// PasswordResetRequestPage.tsx
// Lupa kata sandi tanpa email: NIK + tanggal lahir, menunggu persetujuan
// Staf SIDUTama, lalu membuat kata sandi baru.
// ==========================================

import { Link } from 'react-router-dom'

import type { LucideIcon } from 'lucide-react'
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  KeyRound,
  Landmark,
  Lock,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from 'lucide-react'

import {
  usePasswordResetRequestForm,
  type PasswordResetClaimStatus,
} from '@/features/auth/hooks/usePasswordResetRequestForm'
import { useAuthBackground } from '@/features/auth/hooks/useAuthBackground'
import { AuthBackToLogin } from '@/features/auth/components/AuthBackToLogin'
import { AuthCopyright } from '@/features/auth/components/AuthCopyright'
import { HAL_LOGIN, HAL_LUPA_PASSWORD } from '@/lib/constants/routes'
import { STAF_APP_LABEL } from '@/lib/constants/app'

type StatusInfo = { icon: LucideIcon; title: string; description: string }

// `approved` tidak ada di sini: status itu langsung membuka form kata sandi.
const STATUS_INFO: Record<Exclude<PasswordResetClaimStatus, 'approved'>, StatusInfo> = {
  pending: {
    icon: Clock,
    title: 'Menunggu Persetujuan',
    description: `Permintaan Anda sedang ditinjau ${STAF_APP_LABEL}. Buka lagi halaman ini nanti dari perangkat yang sama, lalu tekan Periksa Status Terbaru.`,
  },
  rejected: {
    icon: XCircle,
    title: 'Permintaan Ditolak',
    description: `${STAF_APP_LABEL} menolak permintaan ini.`,
  },
  expired: {
    icon: ShieldAlert,
    title: 'Batas Waktu Terlewat',
    description:
      'Permintaan sudah disetujui, tetapi batas waktu membuat kata sandi baru sudah lewat.',
  },
  cancelled: {
    icon: ShieldAlert,
    title: 'Permintaan Tidak Berlaku',
    description: 'Permintaan ini digantikan oleh pengajuan yang lebih baru.',
  },
  completed: {
    icon: CheckCircle2,
    title: 'Kata Sandi Sudah Dibuat',
    description: 'Permintaan ini sudah selesai diproses sebelumnya.',
  },
}

export default function PasswordResetRequestPage() {
  const background = useAuthBackground()

  const {
    stage,
    statusData,
    statusError,
    isCheckingStatus,
    refreshStatus,
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
    togglePassword,
    togglePasswordConfirmation,
  } = usePasswordResetRequestForm()

  if (stage === 'done') {
    return (
      <div className={background.className} style={background.style}>
        <div className="sid-login-card">
          <div className="sid-login-logo">
            <CheckCircle2 size={24} />
          </div>

          <div className="sid-login-header">
            <h1 className="sid-login-title">Kata Sandi Berhasil Dibuat</h1>

            <p className="sid-login-description">Silakan login menggunakan kata sandi baru Anda.</p>
          </div>

          <Link to={HAL_LOGIN} className="sid-login-submit">
            <span>Masuk ke Halaman Login</span>

            <KeyRound size={16} />
          </Link>

          <div className="sid-login-footer">
            <AuthCopyright />
          </div>
        </div>
      </div>
    )
  }

  if (stage === 'status') {
    const effectiveStatus = statusData?.status ?? 'pending'
    const info = effectiveStatus === 'approved' ? STATUS_INFO.pending : STATUS_INFO[effectiveStatus]
    const Icon = info.icon
    const canStartOver = effectiveStatus !== 'pending'

    return (
      <div className={background.className} style={background.style}>
        <div className="sid-login-card">
          <div className="sid-login-logo">
            <Icon size={24} />
          </div>

          <div className="sid-login-header">
            <h1 className="sid-login-title">{info.title}</h1>

            <p className="sid-login-description">{info.description}</p>
          </div>

          {statusData && (
            <div className="sid-register-username">
              <span className="sid-register-username-label">Akun</span>

              <strong>{statusData.name ?? statusData.username}</strong>
            </div>
          )}

          {statusData?.response_notes && (
            <div className="sid-register-success-info">{statusData.response_notes}</div>
          )}

          {statusError && <div className="sid-login-error">{statusError}</div>}

          <button
            type="button"
            onClick={() => void refreshStatus()}
            disabled={isCheckingStatus}
            className="sid-login-submit"
          >
            <span>{isCheckingStatus ? 'Memeriksa...' : 'Periksa Status Terbaru'}</span>

            <RotateCcw size={16} />
          </button>

          <div className="sid-login-footer">
            {canStartOver && (
              <p className="sid-login-register-text">
                Perlu mengajukan lagi?
                <button type="button" onClick={startOver} className="sid-login-register-button">
                  Ajukan permintaan baru
                </button>
              </p>
            )}

            <AuthBackToLogin />

            <AuthCopyright />
          </div>
        </div>
      </div>
    )
  }

  if (stage === 'ready') {
    return (
      <div className={background.className} style={background.style}>
        <div className="sid-login-card">
          <div className="sid-login-logo">
            <KeyRound size={24} />
          </div>

          <div className="sid-login-header">
            <h1 className="sid-login-title">Buat Kata Sandi Baru</h1>

            <p className="sid-login-description">
              Permintaan Anda sudah disetujui {STAF_APP_LABEL}. Buat kata sandi baru sekarang.
            </p>
          </div>

          {passwordErrors.general && (
            <div className="sid-login-error">{passwordErrors.general}</div>
          )}

          <form onSubmit={completeReset} className="sid-login-form">
            <div className="sid-login-field">
              <label htmlFor="reset-password" className="sid-login-label">
                Kata Sandi Baru
              </label>

              <div className="sid-login-input-wrapper">
                <Lock size={16} className="sid-login-input-icon" />

                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={passwordForm.password}
                  onChange={handlePasswordChange}
                  autoComplete="new-password"
                  placeholder="Masukkan kata sandi baru"
                  className={`sid-login-input sid-login-input-password ${
                    passwordErrors.password ? 'sid-login-input-error' : ''
                  }`}
                />

                <button
                  type="button"
                  onClick={togglePassword}
                  className="sid-login-password-toggle"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {passwordErrors.password && (
                <span className="sid-login-field-error">{passwordErrors.password}</span>
              )}
            </div>

            <div className="sid-login-field">
              <label htmlFor="reset-password-confirmation" className="sid-login-label">
                Konfirmasi Kata Sandi
              </label>

              <div className="sid-login-input-wrapper">
                <Lock size={16} className="sid-login-input-icon" />

                <input
                  id="reset-password-confirmation"
                  type={showPasswordConfirmation ? 'text' : 'password'}
                  name="password_confirmation"
                  value={passwordForm.password_confirmation}
                  onChange={handlePasswordChange}
                  autoComplete="new-password"
                  placeholder="Ulangi kata sandi baru"
                  className={`sid-login-input sid-login-input-password ${
                    passwordErrors.password_confirmation ? 'sid-login-input-error' : ''
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
                  {showPasswordConfirmation ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {passwordErrors.password_confirmation && (
                <span className="sid-login-field-error">
                  {passwordErrors.password_confirmation}
                </span>
              )}
            </div>

            <button type="submit" disabled={isCompleting} className="sid-login-submit">
              <span>{isCompleting ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}</span>

              <KeyRound size={16} />
            </button>
          </form>

          <div className="sid-login-footer">
            <AuthBackToLogin />

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
          <Landmark size={24} />
        </div>

        <div className="sid-login-header">
          <h1 className="sid-login-title">Lupa Kata Sandi</h1>

          <p className="sid-login-description">
            Masukkan NIK dan tanggal lahir Anda. Setelah {STAF_APP_LABEL} menyetujui, buat kata
            sandi baru dari perangkat ini.
          </p>
        </div>

        {formErrors.general && <div className="sid-login-error">{formErrors.general}</div>}

        <form onSubmit={submitRequest} className="sid-login-form">
          <div className="sid-login-field">
            <label htmlFor="reset-nik" className="sid-login-label">
              Nomor Induk Kependudukan (NIK)
            </label>

            <div className="sid-login-input-wrapper">
              <CreditCard size={16} className="sid-login-input-icon" />

              <input
                id="reset-nik"
                type="text"
                name="nik"
                value={formData.nik}
                onChange={handleChange}
                maxLength={16}
                inputMode="numeric"
                autoComplete="username"
                placeholder="Masukkan 16 digit NIK"
                className={`sid-login-input sid-login-input-with-left-icon ${
                  formErrors.nik ? 'sid-login-input-error' : ''
                }`}
              />
            </div>

            {formErrors.nik && <span className="sid-login-field-error">{formErrors.nik}</span>}
          </div>

          <div className="sid-login-field">
            <label htmlFor="reset-date-of-birth" className="sid-login-label">
              Tanggal Lahir
            </label>

            <div className="sid-login-input-wrapper">
              <CalendarDays size={16} className="sid-login-input-icon" />

              <input
                id="reset-date-of-birth"
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                autoComplete="bday"
                className={`sid-login-input sid-login-input-with-left-icon ${
                  formErrors.date_of_birth ? 'sid-login-input-error' : ''
                }`}
              />
            </div>

            {formErrors.date_of_birth && (
              <span className="sid-login-field-error">{formErrors.date_of_birth}</span>
            )}
          </div>

          <button type="submit" disabled={isSubmitting} className="sid-login-submit">
            <span>{isSubmitting ? 'Mengirim...' : 'Ajukan Permintaan'}</span>

            <KeyRound size={16} />
          </button>
        </form>

        <div className="sid-login-footer">
          <p className="sid-login-register-text">
            Punya email terdaftar?
            <Link to={HAL_LUPA_PASSWORD} className="sid-login-register-button">
              Atur ulang lewat email
            </Link>
          </p>

          <AuthBackToLogin />

          <AuthCopyright />
        </div>
      </div>
    </div>
  )
}
