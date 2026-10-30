import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/cetak-surat/utils/generateSuratPDF', () => ({ downloadSuratPDF: vi.fn() }))

import { LetterRowActions } from './LetterRowActions'

const surat = { id: 'letter-1', letter_number: '470/001', applicant_name: 'Engkos Sutisna' }

describe('LetterRowActions', () => {
  it('shows only Detail by default and opens the letter', () => {
    const onOpen = vi.fn()
    render(<LetterRowActions surat={surat} onOpen={onOpen} />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Lihat detail surat 470/001 Engkos Sutisna' }),
    )

    expect(onOpen).toHaveBeenCalledWith(surat)
    expect(screen.queryByRole('button', { name: /Unduh/ })).toBeNull()
  })

  it('marks the row as Proses when it is the user turn to decide', () => {
    render(<LetterRowActions surat={surat} onOpen={vi.fn()} openLabel="Proses" />)

    const button = screen.getByRole('button', { name: 'Proses surat 470/001 Engkos Sutisna' })
    expect(button).toHaveClass('primary')
    expect(button).toHaveTextContent('Proses')
  })

  it('adds the download menu only when allowed, and supports a disabled state', () => {
    const { rerender } = render(<LetterRowActions surat={surat} onOpen={vi.fn()} canDownload />)

    expect(screen.getByRole('button', { name: /Unduh/ })).toBeEnabled()

    rerender(<LetterRowActions surat={surat} onOpen={vi.fn()} canDownload downloadDisabled />)

    expect(screen.getByRole('button', { name: /Unduh/ })).toBeDisabled()
  })

  it('renders extra actions such as delete', () => {
    render(
      <LetterRowActions
        surat={surat}
        onOpen={vi.fn()}
        extra={<button type="button">Hapus</button>}
      />,
    )

    expect(screen.getByRole('button', { name: 'Hapus' })).toBeInTheDocument()
  })
})
