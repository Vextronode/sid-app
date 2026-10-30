import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ initialUser: null, isLoading: false, loginUser: null }))

// AuthContext tiruan yang tetap menyimpan state, supaya login() memicu render
// ulang GuestRoute seperti di aplikasi sungguhan.
vi.mock('@/features/auth/contexts/AuthContext', async () => {
  const TestAuthContext = createContext(null)

  function AuthProvider({ children }) {
    const [user, setUser] = useState(auth.initialUser)
    const login = useCallback((loggedUser) => setUser(loggedUser ?? null), [])
    const value = useMemo(() => ({ user, isLoading: auth.isLoading, login }), [user, login])
    return <TestAuthContext.Provider value={value}>{children}</TestAuthContext.Provider>
  }

  return { AuthProvider, useAuth: () => useContext(TestAuthContext) }
})

vi.mock('@/features/auth/hooks/useLoginForm', () => ({
  useLoginForm: () => ({
    formData: { username: '', password: '' },
    errors: { username: '', password: '', general: '' },
    isLoading: false,
    handleChange: vi.fn(),
    handleSubmit: async (event, onSuccess) => {
      event?.preventDefault()
      await onSuccess(auth.loginUser)
    },
  }),
}))

import { AuthProvider } from '@/features/auth/contexts/AuthContext'
import LoginPage from '@/pages/LoginPage'
import type { UserRole } from '@/types'

import { GuestRoute, ProtectedRoute } from './App'

function CurrentPath() {
  const location = useLocation()
  return <p data-testid="current-path">{location.pathname + location.search}</p>
}

const currentPath = () => screen.getByTestId('current-path').textContent

function renderAt(entry: string, allowedRoles: UserRole[] = ['warga']) {
  const guarded = (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <p>Halaman terlindungi</p>
    </ProtectedRoute>
  )

  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/jenis-surat" element={guarded} />
          <Route path="/pengajuan-surat/:kode" element={guarded} />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route path="*" element={<CurrentPath />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

beforeEach(() => {
  auth.initialUser = null
  auth.isLoading = false
  auth.loginUser = null
})

describe('ProtectedRoute', () => {
  it('sends guests to login with the target as ?redirect=', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/jenis-surat']}>
          <Routes>
            <Route
              path="/jenis-surat"
              element={
                <ProtectedRoute allowedRoles={['warga']}>
                  <p>Halaman terlindungi</p>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<CurrentPath />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    )
    expect(currentPath()).toBe('/login?redirect=%2Fjenis-surat')
  })

  it('includes the query string of the target', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/pengajuan-surat/SKD?draft=1']}>
          <Routes>
            <Route
              path="/pengajuan-surat/:kode"
              element={
                <ProtectedRoute allowedRoles={['warga']}>
                  <p>Halaman terlindungi</p>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<CurrentPath />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    )
    expect(currentPath()).toBe('/login?redirect=%2Fpengajuan-surat%2FSKD%3Fdraft%3D1')
  })

  it('renders the page for a user with an allowed role', () => {
    auth.initialUser = { role: 'warga' }
    renderAt('/jenis-surat')
    expect(screen.getByText('Halaman terlindungi')).toBeInTheDocument()
  })

  it('sends an official opening a warga letter page to their own letter page, not the public home', () => {
    auth.initialUser = { role: 'rt' }
    renderAt('/jenis-surat')
    expect(currentPath()).toBe('/admin/surat-saya')
  })

  it('sends staf_sid opening a warga letter page to their own Surat Saya', () => {
    auth.initialUser = { role: 'staf_sid' }
    renderAt('/jenis-surat')
    expect(currentPath()).toBe('/admin/surat-saya')
  })

  it('still sends users with a temporary password to /change-password', () => {
    auth.initialUser = { role: 'warga', must_change_password: true }
    renderAt('/jenis-surat')
    expect(currentPath()).toBe('/change-password')
  })
})

describe('GuestRoute', () => {
  it('shows the login page to guests', () => {
    renderAt('/login?redirect=%2Fjenis-surat')
    expect(screen.getByRole('heading', { name: 'Masuk ke SIDUTama' })).toBeInTheDocument()
  })

  it('sends a logged-in warga to an allowed redirect target', () => {
    auth.initialUser = { role: 'warga' }
    renderAt('/login?redirect=%2Fjenis-surat')
    expect(screen.getByText('Halaman terlindungi')).toBeInTheDocument()
  })

  it.each([
    ['warga', '/login', '/surat-saya'],
    ['warga', '/login?redirect=%2F%2Fevil.com', '/surat-saya'],
    ['warga', '/login?redirect=%2Fadmin%2Frt', '/surat-saya'],
    ['rt', '/login?redirect=%2Fjenis-surat', '/admin/surat-saya'],
    ['rt', '/login', '/admin/rt'],
    ['kepala_desa', '/login', '/admin/kades'],
  ])('role %s at %s still goes to %s', (role, entry, expected) => {
    auth.initialUser = { role }
    renderAt(entry)
    expect(currentPath()).toBe(expected)
  })

  it('sends users with a temporary password to /change-password before any redirect', () => {
    auth.initialUser = { role: 'warga', must_change_password: true }
    renderAt('/login?redirect=%2Fjenis-surat')
    expect(currentPath()).toBe('/change-password')
  })
})

describe('login flow inside GuestRoute', () => {
  it('returns warga to the redirect target after login', async () => {
    auth.loginUser = { id: 1, role: 'warga' }
    const { container } = renderAt('/login?redirect=%2Fjenis-surat')

    fireEvent.submit(container.querySelector('form'))

    expect(await screen.findByText('Halaman terlindungi')).toBeInTheDocument()
  })

  it('sends an official to their own letter page after logging in from a letter link', async () => {
    auth.loginUser = { id: 2, role: 'rt' }
    const { container } = renderAt('/login?redirect=%2Fjenis-surat')

    fireEvent.submit(container.querySelector('form'))

    expect(await screen.findByTestId('current-path')).toHaveTextContent('/admin/surat-saya')
  })
})
