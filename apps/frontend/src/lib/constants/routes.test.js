import { describe, expect, it } from 'vitest'
import * as routes from './routes'

describe('beranda routes', () => {
  it('maps logical pages to the existing routes', () => {
    expect(routes.HAL_BERANDA).toBe('/')
    expect(routes.HAL_BERITA).toBe('/berita')
    expect(routes.HAL_PROFIL).toBe('/profil-desa')
    expect(routes.HAL_LOGIN).toBe('/loginpage')
    expect(routes.HAL_AJUKAN_SURAT).toBe('/jenis-surat')
    expect(routes.HAL_STATUS_SURAT).toBe('/daftar-surat-saya')
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
