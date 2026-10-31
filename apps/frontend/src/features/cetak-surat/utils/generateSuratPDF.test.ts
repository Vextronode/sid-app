import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { downloadSuratPDF } from './generateSuratPDF'

describe('downloadSuratPDF', () => {
  const originalFetch = globalThis.fetch
  const originalCreateObjectURL = window.URL.createObjectURL
  const originalRevokeObjectURL = window.URL.revokeObjectURL

  beforeEach(() => {
    globalThis.fetch = vi.fn()
    window.URL.createObjectURL = vi.fn(() => 'blob:letter')
    window.URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    window.URL.createObjectURL = originalCreateObjectURL
    window.URL.revokeObjectURL = originalRevokeObjectURL
    vi.restoreAllMocks()
  })

  it('downloads the backend PDF using the authenticated request', async () => {
    const pdf = new Blob(['pdf content'], { type: 'application/pdf' })
    vi.mocked(globalThis.fetch, { partial: true }).mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(pdf),
    })

    await downloadSuratPDF({ id: 7, letter_number: 'SURAT/2026/007' })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/letters\/7\/download$/),
      expect.objectContaining({
        credentials: 'include',
        headers: { Accept: 'application/pdf' },
      }),
    )
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(pdf)
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()
    expect(document.querySelector('a[download="surat-SURAT-2026-007.pdf"]')).toBeNull()
  })

  it('reports a backend error instead of downloading an error response', async () => {
    vi.mocked(globalThis.fetch, { partial: true }).mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: vi.fn().mockResolvedValue(JSON.stringify({ message: 'Surat belum final.' })),
    })

    // Pesan backend (Indonesia) yang dipakai, bukan "403 Forbidden: {...}".
    await expect(downloadSuratPDF({ id: 7 })).rejects.toThrow('Surat belum final.')
    expect(window.URL.createObjectURL).not.toHaveBeenCalled()
  })
})
