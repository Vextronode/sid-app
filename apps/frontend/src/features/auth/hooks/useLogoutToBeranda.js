import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/features/auth/contexts/AuthContext'
import { HAL_BERANDA } from '@/lib/constants/routes'

// Keluar lalu ke beranda publik. Pindah halaman baru setelah server menghapus
// sesi: bila pindah duluan, tombol "Masuk Warga" yang diklik selagi request
// berjalan masih melihat user login dan GuestRoute langsung membuka dashboard.
// Pindahnya lewat onLoggedOut, sebelum user dikosongkan, agar ProtectedRoute
// tidak sempat mengarahkan ke halaman login.
export function useLogoutToBeranda() {
  const navigate = useNavigate()
  const { logout, isLoggingOut } = useAuth()

  const handleLogout = async () => {
    if (isLoggingOut) return

    try {
      await logout({ onLoggedOut: () => navigate(HAL_BERANDA, { replace: true }) })
    } catch (error) {
      alert(error.response?.data?.message ?? 'Logout gagal. Silakan coba lagi.')
    }
  }

  return { handleLogout, isLoggingOut }
}
