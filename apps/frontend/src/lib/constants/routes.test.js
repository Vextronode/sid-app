import { describe, expect, it } from 'vitest'
import * as routes from './routes'

describe('beranda routes', () => {
  it('maps logical pages to the existing routes', () => {
    expect(routes.HAL_BERANDA).toBe('/')
    expect(routes.HAL_BERITA).toBe('/berita')
    expect(routes.HAL_PROFIL).toBe('/profil-desa')
    expect(routes.HAL_LOGIN).toBe('/login')
    expect(routes.HAL_AJUKAN_SURAT).toBe('/jenis-surat')
    expect(routes.HAL_STATUS_SURAT).toBe('/surat-saya/daftar')
  })

  it('keeps auth pages in English and matches the backend reset link', () => {
    expect(routes.HAL_DAFTAR).toBe('/register')
    expect(routes.HAL_LUPA_PASSWORD).toBe('/forgot-password')
    expect(routes.HAL_RESET_PASSWORD).toBe('/reset-password/:token')
    expect(routes.HAL_GANTI_PASSWORD).toBe('/change-password')
  })

  it('maps the draft information pages (D6)', () => {
    expect(routes.HAL_KEBIJAKAN_PRIVASI).toBe('/kebijakan-privasi')
    expect(routes.HAL_AKSESIBILITAS).toBe('/aksesibilitas')
    expect(routes.HAL_PPID).toBe('/ppid')
  })

  it('builds news detail paths by id', () => {
    expect(routes.HAL_BERITA_DETAIL(12)).toBe('/berita/12')
    expect(routes.HAL_BERITA_DETAIL('a/b')).toBe('/berita/a%2Fb')
  })
})
