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
    globalThis.fetch.mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(pdf),
    })

    await downloadSuratPDF({ id: 7, letter_number: 'SURAT/2026/007' })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/letters/7/download?template=wet'),
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
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: vi.fn().mockResolvedValue('Surat belum final'),
    })

    await expect(downloadSuratPDF({ id: 7 })).rejects.toThrow('403 Forbidden: Surat belum final')
    expect(window.URL.createObjectURL).not.toHaveBeenCalled()
  })
})
