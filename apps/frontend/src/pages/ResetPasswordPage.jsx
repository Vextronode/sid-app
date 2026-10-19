// ==========================================
// ResetPasswordPage.jsx
// Tujuan tautan reset dari email: /password-reset/:token?email=...
// ==========================================

import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Landmark, Lock, Eye, EyeOff, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react'
import api from '@/lib/api'

function firstMessage(error, fallback) {
  const errors = error?.response?.data?.errors

  return (errors && Object.values(errors).flat()[0]) || error?.response?.data?.message || fallback
}

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmation) {
      setError('Konfirmasi kata sandi tidak sama.')
      return
    }

    setIsLoading(true)

    try {
      await api.get('/sanctum/csrf-cookie')
      await api.post('/reset-password', {
        token,
        email,
        password,
        password_confirmation: confirmation,
      })
      setSuccess(true)
      setTimeout(() => navigate('/loginpage', { replace: true }), 1500)
    } catch (err) {
      setError(firstMessage(err, 'Kata sandi gagal diatur ulang.'))
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div
          className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 text-center"
          role="status"
        >
          <div className="w-14 h-14 rounded-full bg-[#e8eef5] flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-[#163e6b]" />
          </div>
          <h2 className="font-bold text-gray-800 text-lg mb-1">Kata Sandi Berhasil Diubah</h2>
          <p className="text-sm text-gray-500">Anda akan diarahkan ke halaman login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6">
        <div className="w-11 h-11 rounded-xl bg-[#163e6b] flex items-center justify-center mb-3">
          <Landmark size={22} className="text-white" />
        </div>
        <p className="font-bold text-gray-800">Cibenda</p>
        <h1 className="text-xl font-bold text-gray-800 mt-1">Buat Kata Sandi Baru</h1>
        <p className="text-sm text-gray-500 mb-6">
          {email ? `Untuk akun ${email}` : 'Tautan atur ulang tidak lengkap. Minta tautan baru.'}
        </p>

        {error && (
          <div
            className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="reset-password"
              className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide"
            >
              Kata Sandi Baru
            </label>
            <div className="relative mt-1">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="reset-password"
                required
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="w-full border rounded-lg pl-10 pr-10 py-2.5 text-sm outline-none focus:border-[#163e6b] bg-gray-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label
              htmlFor="reset-password-confirmation"
              className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide"
            >
              Konfirmasi Kata Sandi Baru
            </label>
            <div className="relative mt-1">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="reset-password-confirmation"
                required
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                className="w-full border rounded-lg pl-10 pr-3 py-2.5 text-sm outline-none focus:border-[#163e6b] bg-gray-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email || !token}
            className="w-full bg-[#163e6b] text-white rounded-lg py-3 text-sm font-medium hover:bg-[#0e2a4a] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'} <KeyRound size={16} />
          </button>
        </form>

        <div className="border-t mt-6 pt-4 text-center">
          <Link
            to="/lupa-password"
            className="text-sm text-[#163e6b] font-medium hover:underline flex items-center justify-center gap-1"
          >
            <ArrowLeft size={14} /> Minta tautan baru
          </Link>
        </div>
      </div>
    </div>
  )
}
