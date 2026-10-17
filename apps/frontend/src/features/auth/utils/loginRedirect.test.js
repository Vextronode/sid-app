import { describe, expect, it } from 'vitest'

import { buildLoginPath, isSafeInternalPath, resolveLoginRedirect } from './loginRedirect'

describe('isSafeInternalPath', () => {
  it('accepts internal paths with one leading slash', () => {
    expect(isSafeInternalPath('/jenis-surat')).toBe(true)
    expect(isSafeInternalPath('/pengajuan-surat/SKD?step=2')).toBe(true)
  })

  it.each([
    ['//evil.com'],
    ['https://evil.com'],
    ['javascript:alert(1)'],
    ['/\\evil.com'],
    ['\\\\evil.com'],
    ['/jenis-surat\n'],
    ['/a//b'],
    ['/javascript:alert(1)'],
    ['jenis-surat'],
    [''],
    [null],
    [undefined],
  ])('rejects %j', (path) => {
    expect(isSafeInternalPath(path)).toBe(false)
  })
})

describe('resolveLoginRedirect', () => {
  it.each([
    ['/jenis-surat'],
    ['/pengajuan-surat'],
    ['/pengajuan-surat/SKD'],
    ['/daftar-surat-saya'],
    ['/daftar-surat'],
    ['/profile'],
  ])('accepts warga page %s for role warga', (path) => {
    expect(resolveLoginRedirect(path, 'warga')).toBe(path)
  })

  it('keeps the query string of an allowed page', () => {
    expect(resolveLoginRedirect('/pengajuan-surat/SKD?draft=1', 'warga')).toBe(
      '/pengajuan-surat/SKD?draft=1',
    )
  })

  it.each([
    ['//evil.com'],
    ['https://evil.com/jenis-surat'],
    ['javascript:alert(1)'],
    ['/\\evil.com'],
    ['/admin/dashboard-surat-rt'],
    ['/admin/operator-desa'],
    ['/'],
    ['/jenis-surat/extra'],
    ['/pengajuan-surat/SKD/x'],
    [null],
  ])('rejects %j for role warga', (path) => {
    expect(resolveLoginRedirect(path, 'warga')).toBeNull()
  })

  it.each([['rt'], ['rw'], ['kadus'], ['kepala_desa'], ['staf_sid'], [undefined]])(
    'rejects warga pages for role %s',
    (role) => {
      expect(resolveLoginRedirect('/jenis-surat', role)).toBeNull()
    },
  )
})

describe('buildLoginPath', () => {
  it('encodes the target as ?redirect=', () => {
    expect(buildLoginPath('/jenis-surat')).toBe('/loginpage?redirect=%2Fjenis-surat')
    expect(buildLoginPath('/pengajuan-surat/SKD?draft=1')).toBe(
      '/loginpage?redirect=%2Fpengajuan-surat%2FSKD%3Fdraft%3D1',
    )
  })

  it('falls back to the plain login page for unsafe targets', () => {
    expect(buildLoginPath('//evil.com')).toBe('/loginpage')
    expect(buildLoginPath(undefined)).toBe('/loginpage')
  })
})
