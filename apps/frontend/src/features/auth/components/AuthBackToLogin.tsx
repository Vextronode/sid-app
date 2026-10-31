import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { HAL_LOGIN } from '@/lib/constants/routes'

// Jalan pulang di kaki kartu halaman lupa/atur ulang kata sandi. Halaman itu
// lanjutan dari Login, jadi tidak ada tautan ke Beranda di sini.
export function AuthBackToLogin() {
  return (
    <Link to={HAL_LOGIN} className="sid-login-back">
      <ArrowLeft size={14} aria-hidden="true" /> Kembali ke Login
    </Link>
  )
}
