// ==========================================
// RegisterPage.jsx
// Halaman daftar akun warga, cuma pakai NIK + password (tanpa email).
// ⚠️ Endpoint /register perlu dicek/disesuaikan sesuai backend asli.
// ==========================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Landmark, CreditCard, User, Lock, Eye, EyeOff, UserPlus, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ nik: '', name: '', password: '', password_confirmation: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (field) => (e) => {
    const value = field === 'nik' ? e.target.value.replace(/\D/g, '') : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.password_confirmation) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }
    if (form.nik.length !== 16) {
      setError('NIK harus 16 digit.');
      return;
    }

    setIsLoading(true);
    try {
        await api.get('/sanctum/csrf-cookie');
      await api.post('/api/register', form);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      const errors = err.response?.data?.errors;
      const message = errors ? Object.values(errors)[0]?.[0] : err.response?.data?.message ?? 'Pendaftaran gagal, coba lagi.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-green-600" />
          </div>
          <h2 className="font-bold text-gray-800 text-lg mb-1">Pendaftaran Berhasil!</h2>
          <p className="text-sm text-gray-500">Kamu akan diarahkan ke halaman login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6">
        <div className="w-11 h-11 rounded-xl bg-green-600 flex items-center justify-center mb-3">
          <Landmark size={22} className="text-white" />
        </div>
        <p className="font-bold text-gray-800">Cibenda</p>
        <h1 className="text-xl font-bold text-gray-800 mt-1">Daftar Akun Warga</h1>
        <p className="text-sm text-gray-500 mb-6">Cukup pakai NIK, tanpa perlu email</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
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
                value={form.nik}
                onChange={handleChange('nik')}
                placeholder="16 Digit NIK"
                className="w-full border rounded-lg pl-10 pr-3 py-2.5 text-sm outline-none focus:border-green-500 bg-gray-50"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Nama Lengkap</label>
            <div className="relative mt-1">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required
                value={form.name}
                onChange={handleChange('name')}
                placeholder="Nama sesuai KTP"
                className="w-full border rounded-lg pl-10 pr-3 py-2.5 text-sm outline-none focus:border-green-500 bg-gray-50"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Password</label>
            <div className="relative mt-1">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange('password')}
                placeholder="Minimal 8 karakter"
                className="w-full border rounded-lg pl-10 pr-10 py-2.5 text-sm outline-none focus:border-green-500 bg-gray-50"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Konfirmasi Password</label>
            <div className="relative mt-1">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required
                type={showPassword ? 'text' : 'password'}
                value={form.password_confirmation}
                onChange={handleChange('password_confirmation')}
                placeholder="Ulangi password"
                className="w-full border rounded-lg pl-10 pr-3 py-2.5 text-sm outline-none focus:border-green-500 bg-gray-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? 'Mendaftarkan...' : 'Daftar Sekarang'} <UserPlus size={16} />
          </button>
        </form>

        <div className="border-t mt-6 pt-4 text-center">
          <p className="text-sm text-gray-500">
            Sudah punya akun? <Link to="/login" className="text-green-600 font-medium hover:underline">Masuk di sini</Link>
          </p>
          <p className="text-[11px] text-gray-400 mt-3">© 2024 Digital Amanah. Sistem Informasi Desa Modern.</p>
        </div>
      </div>
    </div>
  );
}