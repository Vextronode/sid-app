// ==========================================
// ForgotPasswordPage.jsx
// Reset password pakai NIK saja (tanpa email). Alur 2 langkah:
// 1. Masukkan NIK -> submit -> tampil form password baru
// 2. Masukkan password baru + konfirmasi -> submit -> selesai
// ⚠️ Endpoint /forgot-password dan /reset-password perlu dicek/disesuaikan
// sesuai implementasi backend asli.
// ==========================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Landmark, CreditCard, Lock, Eye, EyeOff, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = masukkan NIK, 2 = password baru
  const [nik, setNik] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmitNik = async (e) => {
    e.preventDefault();
    setError('');
    if (nik.length !== 16) {
      setError('NIK harus 16 digit.');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
     setStep(2);
     setIsLoading(false);
    }, 500);
    /* VERSI ASLI (aktifkan lagi kalau backend sudah siap):
    try {
        await api.get('/sanctum/csrf-cookie');
      await api.post('/api/forgot-password', { nik });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message ?? 'NIK tidak ditemukan.');
    } finally {
      setIsLoading(false);
    }
      */
  };

  const handleSubmitNewPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/api/reset-password', { nik, password: newPassword, password_confirmation: confirmPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Gagal reset password.');
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
          <h2 className="font-bold text-gray-800 text-lg mb-1">Password Berhasil Diubah!</h2>
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
        <h1 className="text-xl font-bold text-gray-800 mt-1">Lupa Password</h1>
        <p className="text-sm text-gray-500 mb-6">
          {step === 1 ? 'Masukkan NIK untuk verifikasi identitas Anda' : 'Buat password baru untuk akun Anda'}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSubmitNik}>
            <div className="mb-6">
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? 'Memverifikasi...' : 'Verifikasi NIK'} <KeyRound size={16} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitNewPassword}>
            <div className="mb-4">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Password Baru</label>
              <div className="relative mt-1">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="w-full border rounded-lg pl-10 pr-10 py-2.5 text-sm outline-none focus:border-green-500 bg-gray-50"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Konfirmasi Password Baru</label>
              <div className="relative mt-1">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  className="w-full border rounded-lg pl-10 pr-3 py-2.5 text-sm outline-none focus:border-green-500 bg-gray-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? 'Menyimpan...' : 'Simpan Password Baru'} <KeyRound size={16} />
            </button>
          </form>
        )}

        <div className="border-t mt-6 pt-4 text-center">
          <Link to="/login" className="text-sm text-green-600 font-medium hover:underline flex items-center justify-center gap-1">
            <ArrowLeft size={14} /> Kembali ke Login
          </Link>
          <p className="text-[11px] text-gray-400 mt-3">© 2024 Sistem Informasi Desa Modern.</p>
        </div>
      </div>
    </div>
  );
}