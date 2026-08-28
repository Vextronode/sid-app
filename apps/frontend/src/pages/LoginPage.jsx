// ==========================================
// LoginPage.jsx
// ==========================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Landmark,
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
} from 'lucide-react';

import api from '@/lib/api';
import { useAuth } from '@/features/auth/contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [showRegisterModal, setShowRegisterModal] =
    useState(false);

  const [showForgotModal, setShowForgotModal] =
    useState(false);

  // ==========================================
  // LOGIN
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setIsLoading(true);

    try {
      await api.get('/sanctum/csrf-cookie');

      const response = await api.post('/api/login', {
        username,
        password,
        remember: rememberMe,
      });

      const loggedUser =
        response.data.user ?? response.data;

      login(loggedUser);

      switch (loggedUser.role) {
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
      }
    } catch (err) {
      const message =
        err.response?.data?.errors?.username?.[0] ??
        err.response?.data?.message ??
        'Username atau password salah.';

      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

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

        {error && (
          <div className="sid-login-error">
            {error}
          </div>
        )}


        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          className="sid-login-form"
        >

          {/* USERNAME */}

          <div className="sid-login-field">

            <label className="sid-login-label">
              Username
            </label>

            <div className="sid-login-input-wrapper">

              <User className="sid-login-input-icon" />

              <input
                required
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                placeholder="Masukkan username"
                className="sid-login-input sid-login-input-with-left-icon"
              />

            </div>

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
                Lupa Password?
              </button>

            </div>


            <div className="sid-login-input-wrapper">

              <Lock className="sid-login-input-icon" />

              <input
                required
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="••••••••"
                className="sid-login-input sid-login-input-password"
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