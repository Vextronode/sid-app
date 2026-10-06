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
        setUser(null)
        return null
      }

      setAuthError(
        error.response?.data?.message ??
          'Session tidak dapat diperiksa saat ini.'
      )

      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial session check intentionally synchronizes
    // React state with the external authentication session.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUser()
  }, [refreshUser])

  const login = useCallback((loggedUser) => {
    setAuthError('')
    setUser(loggedUser ?? null)
  }, [])

  const logout = useCallback(async () => {
    setIsLoggingOut(true)
    setAuthError('')

    try {
      await api.get(CSRF_ENDPOINT)

      await api.post(LOGOUT_ENDPOINT)

      setUser(null)
    } catch (error) {
      const status = error.response?.status

      if (isAuthFailure(status)) {
        setUser(null)
        return
      }

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

// useAuth sengaja tetap berada di file ini agar struktur FE tetap sederhana.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth harus digunakan di dalam AuthProvider.'
    )
  }

  return context
}