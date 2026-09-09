
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

    if (isLoading) {
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // ==========================================
      // 1. AMBIL CSRF COOKIE
      // ==========================================


      await api.get('/sanctum/csrf-cookie');



      // ==========================================
      // 2. LOGIN
      // ==========================================


      const response = await api.post('/login', {
        username,
        password,
      });


      // ==========================================
      // 3. AMBIL USER
      // ==========================================

      const loggedUser = response.data?.user;


      if (!loggedUser) {
        throw new Error(
          'Data user tidak ditemukan dari response login.'
        );
      }


      // ==========================================
      // 4. SIMPAN KE AUTH CONTEXT
      // ==========================================


      await login(loggedUser);



      // ==========================================
      // 5. REDIRECT SESUAI ROLE
      // ==========================================



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
          break;
      }

    } catch (err) {
      console.error('LOGIN ERROR:', err);

      console.error(
        'STATUS:',
        err.response?.status
      );

      console.error(
        'RESPONSE:',
        err.response?.data
      );

      if (err.response?.status === 422) {
        const backendErrors =
          err.response.data?.errors;

        setError(
          backendErrors?.username?.[0] ??
          backendErrors?.password?.[0] ??
          err.response.data?.message ??
          'Username atau password salah.'
        );

        return;
      }

      if (err.response?.status === 401) {
        setError(
          'Username atau password salah.'
        );

        return;
      }

      setError(
        err.response?.data?.message ??
        err.message ??
        'Terjadi kesalahan saat login.'
      );

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

            <label
              htmlFor="username"
              className="sid-login-label"
            >
              Username
            </label>

            <div className="sid-login-input-wrapper">

              <User className="sid-login-input-icon" />

              <input
                id="username"
                required
                type="text"
                name="username"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                placeholder="Masukkan username"
                autoComplete="username"
                className="sid-login-input sid-login-input-with-left-icon"
              />

            </div>

          </div>


          {/* PASSWORD */}

          <div className="sid-login-field">

            <div className="sid-login-password-header">

              <label
                htmlFor="password"
                className="sid-login-label"
              >
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
                id="password"
                required
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                name="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="••••••••"
                autoComplete="current-password"
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

