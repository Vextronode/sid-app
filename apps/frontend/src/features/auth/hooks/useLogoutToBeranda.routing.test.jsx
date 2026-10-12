import { useEffect } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))

vi.mock('@/lib/api', () => ({ default: api }))

import { AuthProvider } from '@/features/auth/contexts/AuthContext'
import { ProtectedRoute } from '@/App'
import { useLogoutToBeranda } from './useLogoutToBeranda'

const visited = []

function PathRecorder() {
  const location = useLocation()
  useEffect(() => {
    visited.push(location.pathname)
  }, [location.pathname])
  return null
}

function AdminPage() {
  const { handleLogout } = useLogoutToBeranda()
  return (
    <button type="button" onClick={handleLogout}>
      Keluar
    </button>
  )
}

// Regresi: react-router v7 memindahkan lokasi lewat startTransition, jadi
// user yang dikosongkan lebih dulu sempat membuat ProtectedRoute membuka
// halaman login. Logout harus langsung mendarat di beranda.
describe('logout routing', () => {
  beforeEach(() => {
    visited.length = 0
    vi.clearAllMocks()
    api.get.mockResolvedValue({ data: { user: { id: 1, role: 'petugas_desa' } } })
    api.post.mockResolvedValue({})
  })

  it('lands on the public beranda without passing through the login page', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/admin']}>
          <PathRecorder />
          <Routes>
            <Route path="/" element={<p>Beranda publik</p>} />
            <Route path="/loginpage" element={<p>Halaman login</p>} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Keluar' }))

    expect(await screen.findByText('Beranda publik')).toBeInTheDocument()
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/logout'))
    expect(visited).toEqual(['/admin', '/'])
    expect(screen.queryByText('Halaman login')).not.toBeInTheDocument()
  })
})
