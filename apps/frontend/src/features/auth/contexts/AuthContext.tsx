// ==========================================
// AuthContext.jsx
// Session & Logout - Backend v5.1
// Sanctum cookie-based authentication
// ==========================================

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import api from '@/lib/api'
import { ROLE_FORBIDDEN_EVENT } from '@/lib/authEvents'
import { HAL_LOGIN as LOGIN_PATH } from '@/lib/constants/routes'
import { queryClient } from '@/shared/lib/queryClient'

const AuthContext = createContext(null)

const SESSION_ENDPOINT = '/api/user'
const LOGOUT_ENDPOINT = '/logout'
const CSRF_ENDPOINT = '/sanctum/csrf-cookie'

function resolveUser(response) {
  return response.data?.user ?? response.data?.data ?? response.data ?? null
}

function isAuthFailure(status) {
  return status === 401 || status === 403
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [authError, setAuthError] = useState('')

  const refreshUser = useCallback(async () => {
    setIsLoading(true)
    setAuthError('')

    try {
      const response = await api.get(SESSION_ENDPOINT)

      const currentUser = resolveUser(response)

      setUser(currentUser)

      return currentUser
    } catch (error) {
      const status = error.response?.status

      if (isAuthFailure(status)) {
        queryClient.clear()
        setUser(null)
        return null
      }

      setAuthError(error.response?.data?.message ?? 'Session tidak dapat diperiksa saat ini.')

      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Peran akun berubah di tempat lain (rotasi/turun jabatan oleh Staf) saat
  // pengguna masih membuka dashboard lama: endpoint menolak dengan
  // role_forbidden. Periksa akun tanpa loader; bila perannya memang berubah,
  // muat ulang ke halaman login, yang meneruskan ke dashboard peran baru.
  // Bila perannya sama (penolakan biasa), tidak ada yang dilakukan.
  const userRole = user?.role
  useEffect(() => {
    if (!userRole) return undefined

    let checking = false
    const handleRoleForbidden = async () => {
      if (checking) return
      checking = true
      try {
        const currentRole = resolveUser(await api.get(SESSION_ENDPOINT))?.role
        if (currentRole && currentRole !== userRole) {
          window.location.assign(LOGIN_PATH)
        }
      } catch {
        // Sesi berakhir ditangani pemanggil (401) atau pemeriksaan berikutnya.
      } finally {
        checking = false
      }
    }

    window.addEventListener(ROLE_FORBIDDEN_EVENT, handleRoleForbidden)
    return () => window.removeEventListener(ROLE_FORBIDDEN_EVENT, handleRoleForbidden)
  }, [userRole])

  // Memperbarui sebagian field akun di layar (mis. photo_url setelah ganti
  // foto) tanpa memeriksa ulang sesi, yang akan memunculkan loader.
  const patchUser = useCallback((fields) => {
    setUser((current) => (current ? { ...current, ...fields } : current))
  }, [])

  useEffect(() => {
    // Initial session check intentionally synchronizes
    // React state with the external authentication session.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUser()
  }, [refreshUser])

  // Data ter-cache milik sesi sebelumnya tidak boleh terlihat oleh akun
  // berikutnya di browser yang sama.
  const applySession = useCallback((nextUser) => {
    queryClient.clear()
    setUser(nextUser)
  }, [])

  const login = useCallback(
    (loggedUser) => {
      setAuthError('')
      applySession(loggedUser ?? null)
    },
    [applySession],
  )

  // onLoggedOut (mis. pindah ke beranda) dan pengosongan user dijalankan dalam
  // satu transition. React Router v7 memindahkan lokasi lewat startTransition;
  // bila user dikosongkan di luar transition, React me-render user kosong di
  // halaman lama lebih dulu dan ProtectedRoute membuka halaman login.
  const logout = useCallback(
    async ({ onLoggedOut } = {}) => {
      setIsLoggingOut(true)
      setAuthError('')

      const endSession = () => {
        startTransition(() => {
          onLoggedOut?.()
          applySession(null)
        })
      }

      // Cookie XSRF sudah ada sejak login, jadi langsung POST (satu round-trip).
      // Bila token kedaluwarsa (419), ambil cookie baru lalu ulangi di bawah.
      try {
        await api.post(LOGOUT_ENDPOINT)

        endSession()
      } catch (error) {
        const status = error.response?.status

        if (isAuthFailure(status)) {
          endSession()
          return
        }

        if (status === 419) {
          await api.get(CSRF_ENDPOINT)
          await api.post(LOGOUT_ENDPOINT)

          endSession()
          return
        }

        setAuthError(error.response?.data?.message ?? 'Logout gagal. Silakan coba lagi.')

        throw error
      } finally {
        setIsLoggingOut(false)
      }
    },
    [applySession],
  )

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isLoggingOut,
      authError,
      login,
      logout,
      refreshUser,
      patchUser,
    }),
    [user, isLoading, isLoggingOut, authError, login, logout, refreshUser, patchUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// useAuth sengaja tetap berada di file ini agar struktur FE tetap sederhana.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider.')
  }

  return context
}
