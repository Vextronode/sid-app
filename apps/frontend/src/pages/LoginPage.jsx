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
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6">
        <div className="w-11 h-11 rounded-xl bg-green-600 flex items-center justify-center mb-3">
          <Landmark size={22} className="text-white" />
        </div>
        <p className="font-bold text-gray-800">SIDUTama</p>
        <h1 className="text-xl font-bold text-gray-800 mt-1">Masuk ke SIDUTama</h1>
        <p className="text-sm text-gray-500 mb-6">Masukkan NIK dan Password Anda</p>

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
              <Link to="/lupa-password" className="text-xs text-green-600 hover:underline">Lupa Password?</Link>
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
            Belum punya akun? <Link to="/register" className="text-green-600 font-medium hover:underline">Daftar sekarang</Link>
          </p>
          <p className="text-[11px] text-gray-400 mt-3">Desa Cibenda · Kec. Parigi · Kab. Pangandaran · © 2026</p>
        </div>
      </div>
    </div>
  );
}