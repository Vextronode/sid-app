// ==========================================
// LoginPage.jsx
// ==========================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useLoginForm } from '@/features/auth/hooks/useLoginForm';
import { useAuth } from '@/features/auth/contexts/AuthContext';

import {
  Landmark,
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
} from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // ==========================================
  // LOGIN FORM HOOK
  // ==========================================

  const {
    formData,
    errors,
    isLoading,
    handleChange,
    handleSubmit,
  } = useLoginForm();

  // ==========================================
  // UI STATE
  // ==========================================

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [showRegisterModal, setShowRegisterModal] =
    useState(false);

  const [showForgotModal, setShowForgotModal] =
    useState(false);

  // ==========================================
  // LOGIN SUCCESS
  // ==========================================

  const handleLoginSuccess = async (loggedUser) => {
    try {
      // Simpan user hasil login ke AuthContext
      await login(loggedUser);

      // ==========================================
      // REDIRECT SESUAI ROLE
      // ==========================================

      switch (loggedUser?.role) {
        case 'rt':
          navigate('/admin/dashboard-surat-rt', {
            replace: true,
          });
          break;

        case 'rw':
          navigate('/admin/dashboard-surat-rw', {
            replace: true,
          });
          break;

        case 'kadus':
          navigate('/admin/dashboard-surat-kadus', {
            replace: true,
          });
          break;

        case 'kepala_desa':
          navigate('/admin/dashboard-surat-kades', {
            replace: true,
          });
          break;

        case 'kasi_pelayanan':
        case 'kaur_tu_umum':
        case 'petugas_desa':
          navigate('/admin/operator-desa', {
            replace: true,
          });
          break;

        default:
          navigate('/daftar-surat', {
            replace: true,
          });
          break;
      }
    } catch (error) {
      console.error(
        'LOGIN SUCCESS HANDLER ERROR:',
        error
      );
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="sid-login">

      {/* ==========================================
          LOGIN CARD
          ========================================== */}

      <div className="sid-login-card">

        {/* LOGO */}

        <div className="sid-login-logo">
          <Landmark size={24} />
        </div>

        {/* HEADER */}

        <div className="sid-login-header">

          <h1 className="sid-login-title">
            Masuk ke SIDUTama
          </h1>

          <p className="sid-login-description">
            Masukkan Username dan Password Anda
          </p>

        </div>

        {/* ERROR */}

        {errors.general && (
          <div className="sid-login-error">
            {Array.isArray(errors.general)
              ? errors.general[0]
              : errors.general}
          </div>
        )}

        {/* FORM */}

        <form
          onSubmit={(e) =>
            handleSubmit(e, handleLoginSuccess)
          }
          className="sid-login-form"
        >

          {/* USERNAME */}

          <div className="sid-login-field">

            <label className="sid-login-label">
              Username
            </label>

            <div className="sid-login-input-wrapper">

              <User
                size={16}
                className="sid-login-input-icon"
              />

              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={`sid-login-input sid-login-input-with-left-icon ${
                  errors.username
                    ? 'sid-login-input-error'
                    : ''
                }`}
                placeholder="Masukkan username"
                autoComplete="username"
              />

            </div>

            {errors.username && (
              <span className="sid-login-field-error">
                {Array.isArray(errors.username)
                  ? errors.username[0]
                  : errors.username}
              </span>
            )}

          </div>
          {/* PASSWORD */}

          <div className="sid-login-field">

            <div className="sid-login-password-header">

              <label className="sid-login-label">
                Password
              </label>

              <button
                type="button"
                onClick={() =>
                  setShowForgotModal(true)
                }
                className="sid-login-forgot"
              >
                Lupa password?
              </button>

            </div>

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
                className={`sid-login-input sid-login-input-password ${
                  errors.password
                    ? 'sid-login-input-error'
                    : ''
                }`}
                placeholder="Masukkan password"
                autoComplete="current-password"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (value) => !value
                  )
                }
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
                {Array.isArray(errors.password)
                  ? errors.password[0]
                  : errors.password}
              </span>
            )}

          </div>
          {/* REMEMBER ME */}

          <label className="sid-login-remember">

            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) =>
                setRememberMe(e.target.checked)
              }
            />

            <span>
              Ingat saya di perangkat ini
            </span>

          </label>

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={isLoading}
            className="sid-login-submit"
          >

            <span>
              {isLoading
                ? 'Memproses...'
                : 'Masuk Sekarang'}
            </span>

            <LogIn size={16} />

          </button>

        </form>

        {/* FOOTER */}

        <div className="sid-login-footer">

          <p className="sid-login-register-text">
            Belum punya akun?

            <button
              type="button"
              onClick={() =>
                setShowRegisterModal(true)
              }
              className="sid-login-register-button"
            >
              Daftar sekarang
            </button>
          </p>

          <p className="sid-login-copyright">
            Desa Cibenda · Kec. Parigi · Kab. Pangandaran · © 2026
          </p>

        </div>

      </div>

      {/* ==========================================
          FORGOT PASSWORD MODAL
          ========================================== */}

      {showForgotModal && (
        <div className="sid-login-modal">

          <div
            className="sid-login-modal-overlay"
            onClick={() =>
              setShowForgotModal(false)
            }
          />

          <div className="sid-login-modal-dialog">

            <div className="sid-login-modal-icon sid-login-modal-icon-forgot">
              <Lock size={26} />
            </div>

            <h2 className="sid-login-modal-title">
              Fitur Belum Tersedia
            </h2>

            <p className="sid-login-modal-description">
              Reset password masih dalam tahap
              pengembangan.
              <br />
              Silakan hubungi perangkat desa apabila
              mengalami kendala saat masuk ke akun.
            </p>

            <button
              type="button"
              onClick={() =>
                setShowForgotModal(false)
              }
              className="sid-login-modal-button"
            >
              Mengerti
            </button>

          </div>

        </div>
      )}

      {/* ==========================================
          REGISTER MODAL
          ========================================== */}

      {showRegisterModal && (
        <div className="sid-login-modal">

          <div
            className="sid-login-modal-overlay"
            onClick={() =>
              setShowRegisterModal(false)
            }
          />

          <div className="sid-login-modal-dialog">

            <div className="sid-login-modal-icon sid-login-modal-icon-register">
              <Landmark size={26} />
            </div>

            <h2 className="sid-login-modal-title">
              Fitur Belum Tersedia
            </h2>

            <p className="sid-login-modal-description">
              Pendaftaran akun mandiri masih dalam
              tahap pengembangan.
              <br />
              Silakan datang ke kantor desa untuk
              melakukan pendaftaran sementara.
            </p>

            <button
              type="button"
              onClick={() =>
                setShowRegisterModal(false)
              }
              className="sid-login-modal-button"
            >
              Mengerti
            </button>

          </div>

        </div>
      )}

    </div>
  );
}