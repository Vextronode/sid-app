import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ login: vi.fn() }))
const form = vi.hoisted(() => ({ user: null }))
const villageInfo = vi.hoisted(() => ({ village: null }))

vi.mock('@/features/info-desa/usePublicVillageInfo', () => ({
  usePublicVillageInfo: () => villageInfo,
}))

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ login: auth.login }),
}))

// Form login diganti stub: submit langsung memanggil callback sukses
// dengan user dari test, tanpa API.
vi.mock('@/features/auth/hooks/useLoginForm', () => ({
  useLoginForm: () => ({
    formData: { username: '', password: '' },
    errors: { username: '', password: '', general: '' },
    isLoading: false,
    handleChange: vi.fn(),
    handleSubmit: async (event, onSuccess) => {
      event?.preventDefault()
      await onSuccess(form.user)
    },
  }),
}))

import LoginPage from './LoginPage'

function CurrentPath() {
  const location = useLocation()
  return <p data-testid="current-path">{location.pathname + location.search}</p>
}

async function loginAs(role, entry = '/loginpage') {
  form.user = { id: 1, role }

  const { container } = render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/loginpage" element={<LoginPage />} />
        <Route path="*" element={<CurrentPath />} />
      </Routes>
    </MemoryRouter>,
  )

  fireEvent.submit(container.querySelector('form'))

  return screen.findByTestId('current-path')
}

describe('LoginPage redirect after login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ['rt', '/admin/dashboard-surat-rt'],
    ['rw', '/admin/dashboard-surat-rw'],
    ['kadus', '/admin/dashboard-surat-kadus'],
    ['kepala_desa', '/admin/dashboard-surat-kades'],
    ['kasi_pelayanan', '/admin/operator-desa'],
    ['kaur_tu_umum', '/admin/operator-desa'],
    ['staf_sid', '/admin/operator-desa'],
    ['warga', '/daftar-surat'],
    ['sekretaris_desa', '/daftar-surat'],
  ])('without ?redirect=, role %s goes to %s as before', async (role, expected) => {
    expect(await loginAs(role)).toHaveTextContent(expected)
    expect(auth.login).toHaveBeenCalledWith({ id: 1, role })
  })

  it('sends warga back to an allowed redirect target', async () => {
    const path = await loginAs('warga', '/loginpage?redirect=%2Fjenis-surat')
    expect(path.textContent).toBe('/jenis-surat')
  })

  it('keeps the query string of an allowed redirect target', async () => {
    const path = await loginAs('warga', '/loginpage?redirect=%2Fpengajuan-surat%2FSKD%3Fdraft%3D1')
    expect(path.textContent).toBe('/pengajuan-surat/SKD?draft=1')
  })

  it.each([
    ['%2F%2Fevil.com'],
    ['https%3A%2F%2Fevil.com'],
    ['javascript%3Aalert(1)'],
    ['%2F%5Cevil.com'],
    ['%2Fadmin%2Fdashboard-surat-rt'],
  ])('ignores unsafe or non-warga redirect %s for warga', async (redirect) => {
    const path = await loginAs('warga', `/loginpage?redirect=${redirect}`)
    expect(path.textContent).toBe('/daftar-surat')
  })

  it('maps a warga letter redirect to the official letter page for other roles', async () => {
    const path = await loginAs('rt', '/loginpage?redirect=%2Fjenis-surat')
    expect(path.textContent).toBe('/admin/surat-saya')
  })

  it('ignores a non-letter warga redirect for other roles', async () => {
    const path = await loginAs('rt', '/loginpage?redirect=%2Fprofile')
    expect(path.textContent).toBe('/admin/dashboard-surat-rt')
  })
})

describe('LoginPage links (D4)', () => {
  function renderLogin() {
    render(
      <MemoryRouter initialEntries={['/loginpage']}>
        <Routes>
          <Route path="/loginpage" element={<LoginPage />} />
          <Route path="*" element={<CurrentPath />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('"Kembali ke Beranda" is a link to the home page', () => {
    renderLogin()

    expect(screen.getByRole('link', { name: 'Kembali ke Beranda' })).toHaveAttribute('href', '/')
  })

  it('"Daftar sekarang" is a link to /register', () => {
    renderLogin()

    const link = screen.getByRole('link', { name: 'Daftar sekarang' })
    expect(link).toHaveAttribute('href', '/register')

    fireEvent.click(link)

    expect(screen.getByTestId('current-path').textContent).toBe('/register')
    expect(screen.queryByText('Fitur Belum Tersedia')).not.toBeInTheDocument()
  })

  it('"Lupa password?" stays a button that opens the unavailable-feature modal', () => {
    renderLogin()

    const button = screen.getByRole('button', { name: 'Lupa password?' })
    expect(screen.queryByText('Fitur Belum Tersedia')).not.toBeInTheDocument()

    fireEvent.click(button)

    expect(screen.getByRole('heading', { name: 'Fitur Belum Tersedia' })).toBeInTheDocument()
    expect(screen.getByText(/Reset password masih dalam tahap pengembangan/)).toBeInTheDocument()
  })
})

describe('LoginPage background', () => {
  const renderLogin = () =>
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

  it('uses the village hero photo set by the app staff', () => {
    villageInfo.village = { hero_image_url: '/storage/hero/sawah.jpg' }
    const { container } = renderLogin()

    const root = container.querySelector('.sid-login')
    expect(root).toHaveClass('sid-login--photo')
    expect(root.style.getPropertyValue('--sid-login-bg')).toBe('url("/storage/hero/sawah.jpg")')
  })

  it('falls back to the plain background without a hero photo', () => {
    villageInfo.village = null
    const { container } = renderLogin()

    expect(container.querySelector('.sid-login')).not.toHaveClass('sid-login--photo')
  })
})
