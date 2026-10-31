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
const withDocuments = {
  ...surat,
  documents: [
    { key: 'main', title: 'Surat Keterangan' },
    { key: 'pernyataan', title: 'Surat Pernyataan' },
  ],
}

describe('DownloadSuratMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    downloadSuratPDF.mockResolvedValue(undefined)
  })

  it('downloads a single-document letter directly, without a signature format choice', async () => {
    render(<DownloadSuratMenu surat={surat} />)

    const trigger = screen.getByRole('button', { name: /Unduh surat/ })
    expect(trigger).not.toHaveAttribute('aria-haspopup')

    fireEvent.click(trigger)

    await waitFor(() => expect(downloadSuratPDF).toHaveBeenCalledWith(surat, 'main'))
    expect(screen.queryByRole('menu')).toBeNull()
    expect(screen.queryByText(/TTD/)).toBeNull()
  })

  it('downloads a single-document form directly as well', async () => {
    const form = { id: 'letter-2', letter_type: { signed_by_village_head: false } }
    render(<DownloadSuratMenu surat={form} />)

    fireEvent.click(screen.getByRole('button', { name: /Unduh surat/ }))

    await waitFor(() => expect(downloadSuratPDF).toHaveBeenCalledWith(form, 'main'))
  })

  it('lists every issued document and downloads the chosen one', async () => {
    render(<DownloadSuratMenu surat={withDocuments} />)

    const trigger = screen.getByRole('button', { name: /Unduh surat/ })
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('Surat Keterangan'),
      expect.stringContaining('Surat Pernyataan'),
    ])

    fireEvent.click(screen.getByRole('menuitem', { name: /Surat Pernyataan/ }))

    await waitFor(() => expect(downloadSuratPDF).toHaveBeenCalledWith(withDocuments, 'pernyataan'))
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('focuses the first option, moves with arrow keys and closes on Escape without bubbling', () => {
    // Meniru modal di bawah menu: menutup diri pada Escape yang belum ditangani.
    const outerEscape = vi.fn()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) outerEscape(event)
    }
    document.addEventListener('keydown', onKeyDown)
    render(<DownloadSuratMenu surat={withDocuments} />)

    fireEvent.click(screen.getByRole('button', { name: /Unduh surat/ }))
    const [main, statement] = screen.getAllByRole('menuitem')
    expect(main).toHaveFocus()

    fireEvent.keyDown(present(document.activeElement), { key: 'ArrowDown' })
    expect(statement).toHaveFocus()

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

    await waitFor(() => expect(downloadSuratPDF).toHaveBeenCalledWith(detail, 'f1_01'))
  })

  it('downloads right away when the loaded row has a single document', async () => {
    const row = { id: 'letter-3', letter_type: { signed_by_village_head: false } }
    const detail = { ...row, documents: [{ key: 'main', title: 'Formulir (F-1.04)' }] }
    render(<DownloadSuratMenu surat={row} loadDetail={vi.fn().mockResolvedValue(detail)} />)

    fireEvent.click(screen.getByRole('button', { name: /Unduh surat/ }))

    await waitFor(() => expect(downloadSuratPDF).toHaveBeenCalledWith(detail, 'main'))
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('stays disabled when the letter cannot be downloaded', () => {
    render(<DownloadSuratMenu surat={surat} disabled />)

    expect(screen.getByRole('button', { name: /Unduh surat/ })).toBeDisabled()
  })
})
