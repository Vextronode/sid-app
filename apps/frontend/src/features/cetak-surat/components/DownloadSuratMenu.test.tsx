import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { downloadSuratPDF, alertDialog } = vi.hoisted(() => ({
  downloadSuratPDF: vi.fn(),
  alertDialog: vi.fn(),
}))

vi.mock('@/features/cetak-surat/utils/generateSuratPDF', () => ({ downloadSuratPDF }))
vi.mock('@/shared/lib/dialog', () => ({ alertDialog }))

import { DownloadSuratMenu } from './DownloadSuratMenu'
import { present } from '@/test/fixtures'

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

    await waitFor(() => expect(downloadSuratPDF).toHaveBeenCalledWith(surat, template, 'main'))
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it.each([
    [/TTD digital/, 'digital'],
    [/TTD basah/, 'wet'],
  ])(
    'offers digital and wet signatures for a single-document form (%s)',
    async (option, template) => {
      const form = { id: 'letter-2', letter_type: { signed_by_village_head: false } }
      render(<DownloadSuratMenu surat={form} />)

      // Label tombol sama dengan Persuratan Desa.
      fireEvent.click(screen.getByRole('button', { name: /Unduh surat/ }))
      expect(screen.getAllByRole('menuitem')).toHaveLength(2)
      fireEvent.click(screen.getByRole('menuitem', { name: option }))

      await waitFor(() => expect(downloadSuratPDF).toHaveBeenCalledWith(form, template, 'main'))
    },
  )

  it('lists every issued document of a form under the chosen signature format', async () => {
    const form = {
      id: 'letter-3',
      letter_type: { signed_by_village_head: false },
      documents: [
        { key: 'main', title: 'Formulir Pindah' },
        { key: 'pendaftaran', title: 'Formulir Pendaftaran' },
      ],
    }
    render(<DownloadSuratMenu surat={form} />)

    fireEvent.click(screen.getByRole('button', { name: /Unduh surat/ }))
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('Formulir Pindah'),
      expect.stringContaining('Formulir Pendaftaran'),
    ])
    expect(screen.getByRole('menuitemradio', { name: /TTD digital/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    fireEvent.click(screen.getByRole('menuitem', { name: /Formulir Pendaftaran/ }))
    await waitFor(() =>
      expect(downloadSuratPDF).toHaveBeenCalledWith(form, 'digital', 'pendaftaran'),
    )

    // TTD basah: pilih formatnya dulu, menu tetap terbuka.
    fireEvent.click(screen.getByRole('button', { name: /Unduh surat/ }))
    fireEvent.click(screen.getByRole('menuitemradio', { name: /TTD basah/ }))
    expect(screen.getByRole('menuitemradio', { name: /TTD basah/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    fireEvent.click(screen.getByRole('menuitem', { name: /Formulir Pindah/ }))
    await waitFor(() => expect(downloadSuratPDF).toHaveBeenCalledWith(form, 'wet', 'main'))
  })

  it('adds documents issued together after the two formats of a signed letter', () => {
    render(
      <DownloadSuratMenu
        surat={{
          ...surat,
          documents: [
            { key: 'main', title: 'Surat Keterangan' },
            { key: 'pernyataan', title: 'Surat Pernyataan' },
          ],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Unduh surat/ }))
    expect(screen.getAllByRole('menuitem')).toHaveLength(3)
    expect(screen.getByRole('menuitem', { name: /Surat Pernyataan/ })).toBeTruthy()
  })

  it('focuses the first option, moves with arrow keys and closes on Escape without bubbling', () => {
    // Meniru modal di bawah menu: menutup diri pada Escape yang belum ditangani.
    const outerEscape = vi.fn()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) outerEscape(event)
    }
    document.addEventListener('keydown', onKeyDown)
    render(<DownloadSuratMenu surat={surat} />)

    fireEvent.click(screen.getByRole('button', { name: /Unduh surat/ }))
    const [digital, wet] = screen.getAllByRole('menuitem')
    expect(digital).toHaveFocus()

    fireEvent.keyDown(present(document.activeElement), { key: 'ArrowDown' })
    expect(wet).toHaveFocus()

    fireEvent.keyDown(present(document.activeElement), { key: 'Escape' })
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

  it('loads the issued documents of a table row before offering them', async () => {
    const row = { id: 'letter-2', letter_type: { signed_by_village_head: false } }
    const detail = {
      ...row,
      documents: [
        { key: 'main', title: 'Formulir Pendaftaran (F-1.02)' },
        { key: 'f1_01', title: 'Formulir Biodata Keluarga (F-1.01)' },
      ],
    }
    const loadDetail = vi.fn().mockResolvedValue(detail)
    render(<DownloadSuratMenu surat={row} label="Unduh" loadDetail={loadDetail} />)

    fireEvent.click(screen.getByRole('button', { name: /Unduh/ }))

    await waitFor(() => expect(loadDetail).toHaveBeenCalledWith('letter-2'))
    fireEvent.click(await screen.findByRole('menuitem', { name: /F-1.01/ }))

    await waitFor(() => expect(downloadSuratPDF).toHaveBeenCalledWith(detail, 'digital', 'f1_01'))
  })

  it('offers both signature formats when the loaded row has a single document', async () => {
    const row = { id: 'letter-3', letter_type: { signed_by_village_head: false } }
    const detail = { ...row, documents: [{ key: 'main', title: 'Formulir (F-1.04)' }] }
    render(<DownloadSuratMenu surat={row} loadDetail={vi.fn().mockResolvedValue(detail)} />)

    fireEvent.click(screen.getByRole('button', { name: /Unduh surat/ }))
    fireEvent.click(await screen.findByRole('menuitem', { name: /TTD basah/ }))

    await waitFor(() => expect(downloadSuratPDF).toHaveBeenCalledWith(detail, 'wet', 'main'))
  })

  it('stays disabled when the letter cannot be downloaded', () => {
    render(<DownloadSuratMenu surat={surat} disabled />)

    expect(screen.getByRole('button', { name: /Unduh surat/ })).toBeDisabled()
  })
})
