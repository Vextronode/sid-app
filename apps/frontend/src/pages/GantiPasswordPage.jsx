// ==========================================
// GantiPasswordPage.jsx
// Wajib ganti kata sandi: akun yang kata sandinya baru dibuat/direset
// Petugas Desa (must_change_password) ditolak backend di semua endpoint
// lain sampai kata sandi sementara diganti di sini.
// ==========================================

import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Landmark, Lock, Eye, EyeOff, KeyRound, LogOut } from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { useLogoutToBeranda } from '@/features/auth/hooks/useLogoutToBeranda'
import { PageLoader } from '@/components/ui/PageLoader'
import { STAF_APP_LABEL } from '@/lib/constants/app'
import { notifySuccess } from '@/shared/lib/toast'

const EMPTY_FORM = { current_password: '', password: '', password_confirmation: '' }

function firstMessage(error, fallback) {
  const errors = error?.response?.data?.errors

  return (errors && Object.values(errors).flat()[0]) || error?.response?.data?.message || fallback
}

export default function GantiPasswordPage() {
  const navigate = useNavigate()
  const { user, isLoading, refreshUser } = useAuth()
  const { handleLogout, isLoggingOut } = useLogoutToBeranda()

  const [form, setForm] = useState(EMPTY_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (isLoading) {
    return <PageLoader fullscreen />
  }

  if (!user) {
    return <Navigate to="/loginpage" replace />
  }

  // Halaman login meneruskan user yang sudah masuk ke beranda perannya.
  if (!user.must_change_password && !saving) {
    return <Navigate to="/loginpage" replace />
  }

  const handleChange = (field) => (e) =>
    setForm((current) => ({ ...current, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.password_confirmation) {
      setError('Konfirmasi kata sandi tidak sama.')
      return
    }

    setSaving(true)

    try {
      await api.put('/api/profile/password', form)
      await refreshUser()
      notifySuccess('Kata sandi berhasil diperbarui.')
      navigate('/loginpage', { replace: true })
    } catch (err) {
      setError(firstMessage(err, 'Kata sandi gagal diperbarui.'))
      setSaving(false)
    }
  }

  const fields = [
    {
      id: 'current_password',
      label: 'Kata Sandi Sementara',
      placeholder: `Kata sandi dari ${STAF_APP_LABEL}`,
      autoComplete: 'current-password',
    },
    {
      id: 'password',
      label: 'Kata Sandi Baru',
      placeholder: 'Minimal 8 karakter',
      autoComplete: 'new-password',
    },
    {
      id: 'password_confirmation',
      label: 'Konfirmasi Kata Sandi Baru',
      placeholder: 'Ulangi kata sandi baru',
      autoComplete: 'new-password',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6">
        <div className="w-11 h-11 rounded-xl bg-[#163e6b] flex items-center justify-center mb-3">
          <Landmark size={22} className="text-white" />
        </div>
        <p className="font-bold text-gray-800">Cibenda</p>
        <h1 className="text-xl font-bold text-gray-800 mt-1">Ganti Kata Sandi</h1>
        <p className="text-sm text-gray-500 mb-6">
          Akun Anda memakai kata sandi sementara. Buat kata sandi baru dulu sebelum melanjutkan.
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
          {fields.map((field) => (
            <div key={field.id} className="mb-4">
              <label
                htmlFor={`ganti-${field.id}`}
                className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide"
              >
                {field.label}
              </label>
              <div className="relative mt-1">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  id={`ganti-${field.id}`}
                  required
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={field.autoComplete}
                  value={form[field.id]}
                  onChange={handleChange(field.id)}
                  placeholder={field.placeholder}
                  className="w-full border rounded-lg pl-10 pr-3 py-2.5 text-sm outline-none focus:border-[#163e6b] bg-gray-50"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-xs text-gray-500 flex items-center gap-1 mb-5"
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          </button>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#163e6b] text-white rounded-lg py-3 text-sm font-medium hover:bg-[#0e2a4a] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'} <KeyRound size={16} />
          </button>
        </form>

        <div className="border-t mt-6 pt-4 text-center">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-sm text-gray-500 font-medium hover:underline inline-flex items-center justify-center gap-1"
          >
            <LogOut size={14} /> {isLoggingOut ? 'Keluar…' : 'Keluar'}
          </button>
        </div>
      </div>
    </div>
  )
}
