import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/cetak-surat/components/PdfCanvasPreview', () => ({
  PdfCanvasPreview: ({ documentKey = 'main' }) => <p>pratinjau:{documentKey}</p>,
}))

import { LetterDocumentsPreview } from './LetterDocumentsPreview'

describe('LetterDocumentsPreview', () => {
  it('shows a plain preview when only the main document is issued', () => {
    render(
      <LetterDocumentsPreview surat={{ id: 1, documents: [{ key: 'main', title: 'Surat' }] }} />,
    )

    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.getByText('pratinjau:main')).toBeTruthy()
  })

  it('switches the preview between documents issued together', () => {
    render(
      <LetterDocumentsPreview
        surat={{
          id: 1,
          documents: [
            { key: 'main', title: 'Formulir Pindah' },
            { key: 'pendaftaran', title: 'Formulir Pendaftaran' },
          ],
        }}
      />,
    )

    expect(screen.getByRole('tab', { name: 'Formulir Pindah' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Formulir Pendaftaran' }))

    expect(screen.getByRole('tab', { name: 'Formulir Pendaftaran' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText('pratinjau:pendaftaran')).toBeTruthy()
  })
})
