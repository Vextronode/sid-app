import { render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { InfoPage } from './InfoPage'

// Jumlah judul dan slot sesuai 08-draf-halaman-informasi.md.
const PAGES = [
  {
    page: 'kebijakan-privasi',
    title: 'Kebijakan Privasi',
    status: 'Status: draf, berlaku sejak [TANGGAL BERLAKU].',
    h2: 7,
    h3: 3,
    slots: 5,
  },
  {
    page: 'aksesibilitas',
    title: 'Pernyataan Aksesibilitas',
    status: 'Status: draf, diperbarui Oktober 2026.',
    h2: 4,
    h3: 0,
    slots: 3,
  },
  {
    page: 'ppid',
    title: 'Pejabat Pengelola Informasi dan Dokumentasi (PPID)',
    status: 'Status: draf, perlu diverifikasi dan ditetapkan oleh Pemerintah Desa Cibenda.',
    h2: 6,
    h3: 4,
    slots: 12,
  },
]

describe('InfoPage', () => {
  let scrollTo

  beforeEach(() => {
    scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  afterEach(() => {
    scrollTo.mockRestore()
  })

  it.each(PAGES)('renders $page with one h1 and the draft headings', ({ page, title, h2, h3 }) => {
    const { container } = render(<InfoPage page={page} />)

    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0]).toHaveTextContent(title)
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(h2)
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(h3)
    // Di dalam MainLayout (yang sudah punya <main>): isi berupa <article> di .bd-root.
    expect(container.firstChild).toHaveClass('bd-root', 'bd-info')
    expect(container.querySelector('article')).not.toBeNull()
    expect(container.querySelector('main')).toBeNull()
  })

  it.each(PAGES)('shows the draft status note on $page', ({ page, status }) => {
    const { container } = render(<InfoPage page={page} />)

    expect(container.querySelector('.bd-info-status')).toHaveTextContent(status)
  })

  it.each(PAGES)('marks every [placeholder] on $page as a visible slot', ({ page, slots }) => {
    const { container } = render(<InfoPage page={page} />)

    const marks = [...container.querySelectorAll('mark.bd-info-slot')]
    expect(marks).toHaveLength(slots)
    for (const mark of marks) expect(mark.textContent).toMatch(/^\[[^\]]+\]$/)
    // Tidak ada kurung siku yang tertinggal di luar slot.
    const textOutsideSlots = container.textContent.replace(/\[[^\]]+\]/g, '')
    expect(textOutsideSlots).not.toMatch(/[[\]]/)
  })

  it('keeps the placeholder text unchanged inside a sentence', () => {
    render(<InfoPage page="kebijakan-privasi" />)

    const paragraph = screen.getByText(/Data disimpan di server yang dikelola/)
    expect(paragraph).toHaveTextContent(
      'Data disimpan di server yang dikelola [PENGELOLA SERVER] dan hanya dapat diakses oleh petugas berwenang. Data permohonan disimpan selama [JANGKA WAKTU PENYIMPANAN] sesuai ketentuan arsip desa.',
    )
    expect(within(paragraph).getByText('[PENGELOLA SERVER]').tagName).toBe('MARK')
  })

  it('lists the four PPID request steps in one ordered list', () => {
    const { container } = render(<InfoPage page="ppid" />)

    const lists = container.querySelectorAll('ol')
    expect(lists).toHaveLength(1)
    expect(within(lists[0]).getAllByRole('listitem')).toHaveLength(4)
  })

  it('scrolls to the top when a page opens', () => {
    const { rerender } = render(<InfoPage page="aksesibilitas" />)
    expect(scrollTo).toHaveBeenCalledWith(0, 0)

    scrollTo.mockClear()
    rerender(<InfoPage page="ppid" />)
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('renders nothing for an unknown page', () => {
    const { container } = render(<InfoPage page="tidak-ada" />)

    expect(container).toBeEmptyDOMElement()
  })
})
