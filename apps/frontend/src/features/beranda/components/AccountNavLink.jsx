import { LayoutDashboard } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '@/features/auth/contexts/AuthContext'
import { HAL_LOGIN } from '@/lib/constants/routes'

// Tombol akun di header publik. Belum login: "Masuk". Sudah login:
// "Dashboard Saya". Keduanya menuju HAL_LOGIN, karena GuestRoute sudah
// meneruskan pengguna yang login ke dashboard sesuai perannya.
export function AccountNavLink({ nav, className, onClick }) {
  const { user } = useAuth()

  return (
    <Link to={HAL_LOGIN} className={className} onClick={onClick}>
      {user ? (
        <>
          <LayoutDashboard size={18} aria-hidden="true" className="bd-account-icon" />
          {nav.dashboard}
        </>
      ) : (
        nav.masuk
      )}
    </Link>
  )
}
