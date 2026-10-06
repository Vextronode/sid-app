// ==========================================
// AuthContext.jsx
// Session & Logout - Backend v5.1
// Sanctum cookie-based authentication
// ==========================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import api from '@/lib/api'

const AuthContext = createContext(null)

const SESSION_ENDPOINT = '/api/user'
const LOGOUT_ENDPOINT = '/api/logout'
const CSRF_ENDPOINT = '/sanctum/csrf-cookie'

function resolveUser(response) {
  return (
    response.data?.user ??
    response.data?.data ??
    response.data ??
    null
  )
}

function isAuthFailure(status) {
  return status === 401 || status === 403
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [authError, setAuthError] = useState('')

  // ==========================================
  // REHYDRATE SESSION
  // ==========================================

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

      // Session memang sudah tidak valid.
      if (isAuthFailure(status)) {
        setUser(null)
        return null
      }

      // Error koneksi/server tidak langsung dianggap logout.
      setAuthError(
        error.response?.data?.message ??
          'Session tidak dapat diperiksa saat ini.'
      )

      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ==========================================
  // INITIAL SESSION CHECK
  // ==========================================

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  // ==========================================
  // LOGIN
  // ==========================================
  // Login request dilakukan oleh useLoginForm.
  // AuthContext hanya menyimpan user hasil login
  // ke state global.

  const login = useCallback((loggedUser) => {
    setAuthError('')
    setUser(loggedUser ?? null)
  }, [])

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = useCallback(async () => {
    setIsLoggingOut(true)
    setAuthError('')

    try {
      // Pastikan CSRF cookie tersedia sebelum POST logout.
      await api.get(CSRF_ENDPOINT)

      await api.post(LOGOUT_ENDPOINT)

      setUser(null)
    } catch (error) {
      const status = error.response?.status

      // Session sudah tidak ada di server.
      // Dari sisi frontend, logout dianggap selesai.
      if (isAuthFailure(status)) {
        setUser(null)
        return
      }

      // Retry sekali apabila CSRF token sudah tidak valid.
      if (status === 419) {
        await api.get(CSRF_ENDPOINT)
        await api.post(LOGOUT_ENDPOINT)

        setUser(null)
        return
      }

      setAuthError(
        error.response?.data?.message ??
          'Logout gagal. Silakan coba lagi.'
      )

      throw error
    } finally {
      setIsLoggingOut(false)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isLoggingOut,
      authError,

      login,
      logout,
      refreshUser,
    }),
    [
      user,
      isLoading,
      isLoggingOut,
      authError,
      login,
      logout,
      refreshUser,
    ]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth harus digunakan di dalam AuthProvider.'
    )
  }

  return context
}