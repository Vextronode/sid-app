import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { downloadSuratPDF, alertDialog } = vi.hoisted(() => ({
  downloadSuratPDF: vi.fn(),
  alertDialog: vi.fn(),
}))

vi.mock('@/features/cetak-surat/utils/generateSuratPDF', () => ({ downloadSuratPDF }))
vi.mock('@/shared/lib/dialog', () => ({ alertDialog }))

import { DownloadSuratMenu } from './DownloadSuratMenu'

const surat = { id: 'letter-1', letter_number: '470/001' }

describe('DownloadSuratMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    downloadSuratPDF.mockResolvedValue(undefined)
  })

  it.each([
    [/TTD & stempel digital/, 'digital'],
    [/Untuk tanda tangan basah/, 'wet'],
  ])('downloads the chosen format (%s)', async (option, template) => {
    render(<DownloadSuratMenu surat={surat} />)

    const trigger = screen.getByRole('button', { name: /Unduh surat/ })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(screen.getByRole('menuitem', { name: option }))

    await waitFor(() => expect(downloadSuratPDF).toHaveBeenCalledWith(surat, template))
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('offers a single download for forms without the village head signature', async () => {
    const form = { id: 'letter-2', letter_type: { signed_by_village_head: false } }
    render(<DownloadSuratMenu surat={form} />)

    const trigger = screen.getByRole('button', { name: /Unduh formulir/ })
    expect(trigger).not.toHaveAttribute('aria-haspopup')

    fireEvent.click(trigger)

    await waitFor(() => expect(downloadSuratPDF).toHaveBeenCalledWith(form, 'digital'))
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('focuses the first option, moves with arrow keys and closes on Escape without bubbling', () => {
    // Meniru modal di bawah menu: menutup diri pada Escape yang belum ditangani.
    const outerEscape = vi.fn()
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !event.defaultPrevented) outerEscape(event)
    }
    document.addEventListener('keydown', onKeyDown)
    render(<DownloadSuratMenu surat={surat} />)

    fireEvent.click(screen.getByRole('button', { name: /Unduh surat/ }))
    const [digital, wet] = screen.getAllByRole('menuitem')
    expect(digital).toHaveFocus()

    fireEvent.keyDown(document.activeElement, { key: 'ArrowDown' })
    expect(wet).toHaveFocus()

    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(screen.getByRole('button', { name: /Unduh surat/ })).toHaveFocus()
    // Escape milik menu tidak ikut menutup modal di bawahnya.
    expect(outerEscape).not.toHaveBeenCalled()

    document.removeEventListener('keydown', onKeyDown)
  })

  it('shows an error dialog when the download fails', async () => {
    downloadSuratPDF.mockRejectedValueOnce(new Error('Surat belum final.'))
    render(<DownloadSuratMenu surat={surat} />)

    fireEvent.click(screen.getByRole('button', { name: /Unduh surat/ }))
    fireEvent.click(screen.getByRole('menuitem', { name: /TTD & stempel digital/ }))

    await waitFor(() =>
      expect(alertDialog).toHaveBeenCalledWith(expect.objectContaining({ title: 'Unduhan gagal' })),
    )
  })

  it('stays disabled when the letter cannot be downloaded', () => {
    render(<DownloadSuratMenu surat={surat} disabled />)

    expect(screen.getByRole('button', { name: /Unduh surat/ })).toBeDisabled()
  })
})
