// ==========================================
// LoginPage.jsx
// Redesign login sesuai desain: ikon bank hijau, judul "Cibenda",
// "Masuk ke CID Cibenda", form NIK + Password, checkbox "Ingat saya",
// link "Lupa Password?" dan "Daftar sekarang".
// Login pakai NIK (bukan email), sesuai validasi backend.
// ==========================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Landmark, CreditCard, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/features/auth/contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth(); // sesuaikan kalau nama fungsi di AuthContext beda

  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
const [showRegisterModal, setShowRegisterModal] = useState(false);
const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await api.get('/sanctum/csrf-cookie');
      const response = await api.post('/api/login', { nik, password, remember: rememberMe });
      const loggedUser = response.data.user ?? response.data;

      login(loggedUser);

      switch (loggedUser.role) {
        case "rt":
          navigate("/admin/dashboard-surat-rt", { replace: true });
          break;

        case "rw":
          navigate("/admin/dashboard-surat-rw", { replace: true });
          break;

        case "kadus":
          navigate("/admin/dashboard-surat-kadus", { replace: true });
          break;

        case "kepala_desa":
          navigate("/admin/dashboard-surat-kades", { replace: true });
          break;

        case "kasi_pelayanan":
        case "kaur_tu_umum":
        case "petugas_desa":
          navigate("/admin/operator-desa", { replace: true });
          break;

        default:
          navigate("/daftar-surat", { replace: true });
      }

    } catch (err) {
      const message = err.response?.data?.errors?.nik?.[0] ?? err.response?.data?.message ?? 'NIK atau password salah.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6 ">
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center">
          <Landmark size={24} className="text-white" />
        </div>
      </div>
        <p className="font-bold text-gray-800"></p>
        <h1 className="text-xl font-bold text-gray-800 mt-1 text-center">Masuk ke SIDUTama</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">Masukkan NIK dan Password Anda</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Nomor Induk Kependudukan (NIK)</label>
            <div className="relative mt-1">
              <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required
                maxLength={16}
                inputMode="numeric"
                value={nik}
                onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
                placeholder="16 Digit NIK"
                className="w-full border rounded-lg pl-10 pr-3 py-2.5 text-sm outline-none focus:border-green-500 bg-gray-50"
              />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Password</label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-green-600 hover:underline"
              >
                Lupa Password?
              </button>
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border rounded-lg pl-10 pr-10 py-2.5 text-sm outline-none focus:border-green-500 bg-gray-50"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 mb-5 cursor-pointer">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded accent-green-600" />
            <span className="text-sm text-gray-600">Ingat saya di perangkat ini</span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? 'Memproses...' : 'Masuk Sekarang'} <LogIn size={16} />
          </button>
        </form>

        <div className="border-t mt-6 pt-4 text-center">
          <p className="text-sm text-gray-500">
            Belum punya akun? <button
  type="button"
  onClick={() => setShowRegisterModal(true)}
  className="text-green-600 font-medium hover:underline"
>
  Daftar sekarang
</button>
          </p>
          <p className="text-[11px] text-gray-400 mt-3">Desa Cibenda · Kec. Parigi · Kab. Pangandaran · © 2026</p>
        </div>
      </div>
      {showForgotModal && (
  <>
    <div
      className="fixed inset-0 bg-black/40 z-40"
      onClick={() => setShowForgotModal(false)}
    />

    <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-4">
          <Lock size={26} className="text-blue-600" />
        </div>

        <h2 className="text-lg font-bold text-gray-800">
          Fitur Belum Tersedia
        </h2>

        <p className="text-sm text-gray-500 mt-2">
          Reset password masih dalam tahap pengembangan.
          <br />
          Silakan hubungi perangkat desa apabila mengalami kendala saat masuk ke akun.
        </p>

        <button
          onClick={() => setShowForgotModal(false)}
          className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 font-medium"
        >
          Mengerti
        </button>
      </div>
    </div>
  </>
)}
      {showRegisterModal && (
  <>
    <div
      className="fixed inset-0 bg-black/40 z-40"
      onClick={() => setShowRegisterModal(false)}
    />

    <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 mx-auto rounded-full bg-yellow-100 flex items-center justify-center mb-4">
          <Landmark size={26} className="text-yellow-600" />
        </div>

        <h2 className="text-lg font-bold text-gray-800">
          Fitur Belum Tersedia
        </h2>

        <p className="text-sm text-gray-500 mt-2">
          Pendaftaran akun mandiri masih dalam tahap pengembangan.
          <br />
          Silakan datang ke kantor desa untuk melakukan pendaftaran sementara.
        </p>

        <button
          onClick={() => setShowRegisterModal(false)}
          className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 font-medium"
        >
          Mengerti
        </button>
      </div>
    </div>
  </>
)}
    </div>
  );
}