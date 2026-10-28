// ==========================================
// ForgotPasswordPage.jsx
// Lupa kata sandi lewat email: backend mengirim tautan reset ke email yang
// terdaftar pada akun. Akun tanpa email meminta reset ke Staf SIDUTama.
// ==========================================

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Landmark, Mail, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react'
import api from '@/lib/api'
import { STAF_APP_LABEL } from '@/lib/constants/app'

function firstMessage(error, fallback) {
  const errors = error?.response?.data?.errors

  return (errors && Object.values(errors).flat()[0]) || error?.response?.data?.message || fallback
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await api.get('/sanctum/csrf-cookie')
      await api.post('/forgot-password', { email: email.trim() })
      setSent(true)
    } catch (err) {
      setError(firstMessage(err, 'Tautan atur ulang kata sandi gagal dikirim. Coba lagi nanti.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6">
        <div className="w-11 h-11 rounded-xl bg-[#163e6b] flex items-center justify-center mb-3">
          <Landmark size={22} className="text-white" />
        </div>
        <p className="font-bold text-gray-800">Cibenda</p>
        <h1 className="text-xl font-bold text-gray-800 mt-1">Lupa Kata Sandi</h1>

        {sent ? (
          <div className="mt-4" role="status">
            <div className="w-14 h-14 rounded-full bg-[#e8eef5] flex items-center justify-center mb-4">
              <CheckCircle2 size={28} className="text-[#163e6b]" />
            </div>
            <p className="text-sm text-gray-600">
              Tautan untuk membuat kata sandi baru sudah dikirim ke <strong>{email}</strong>. Buka
              email tersebut lalu ikuti tautannya.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">
              Masukkan email yang terdaftar pada akun Anda. Kami akan mengirim tautan untuk membuat
              kata sandi baru.
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
              <div className="mb-6">
                <label
                  htmlFor="forgot-email"
                  className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide"
                >
                  Email
                </label>
                <div className="relative mt-1">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="forgot-email"
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full border rounded-lg pl-10 pr-3 py-2.5 text-sm outline-none focus:border-[#163e6b] bg-gray-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#163e6b] text-white rounded-lg py-3 text-sm font-medium hover:bg-[#0e2a4a] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? 'Mengirim...' : 'Kirim Tautan Atur Ulang'} <KeyRound size={16} />
              </button>
            </form>
          </>
        )}

        <p className="text-xs text-gray-500 bg-gray-50 border rounded-lg px-3 py-2 mt-5">
          Tidak punya email atau belum mendaftarkannya? Datang ke kantor desa dan minta{' '}
          {STAF_APP_LABEL} mengatur ulang kata sandi Anda.
        </p>

        <div className="border-t mt-6 pt-4 text-center">
          <Link
            to="/login"
            className="text-sm text-[#163e6b] font-medium hover:underline flex items-center justify-center gap-1"
          >
            <ArrowLeft size={14} /> Kembali ke Login
          </Link>
        </div>
      </div>
    </div>
  )
}
