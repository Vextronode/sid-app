import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/features/auth/contexts/AuthContext'
import { HAL_BERANDA } from '@/lib/constants/routes'
import { alertDialog } from '@/shared/lib/dialog'
import { getApiErrorMessage } from '@/shared/lib/apiError'

// Keluar lalu ke beranda publik. Pindah halaman baru setelah server menghapus
// sesi: bila pindah duluan, tombol "Masuk" yang diklik selagi request
// berjalan masih melihat user login dan GuestRoute langsung membuka dashboard.
// Pindahnya lewat onLoggedOut, yang di-commit bersamaan dengan pengosongan
// user (lihat AuthContext.logout), agar ProtectedRoute tidak sempat
// mengarahkan ke halaman login.
export function useLogoutToBeranda() {
  const navigate = useNavigate()
  const { logout, isLoggingOut } = useAuth()

  const handleLogout = async () => {
    if (isLoggingOut) return

    try {
      await logout({ onLoggedOut: () => navigate(HAL_BERANDA, { replace: true }) })
    } catch (error) {
      alertDialog({
        title: 'Gagal keluar',
        message: getApiErrorMessage(error, 'Logout gagal. Silakan coba lagi.'),
      })
    }
  }

  return { handleLogout, isLoggingOut }
}
