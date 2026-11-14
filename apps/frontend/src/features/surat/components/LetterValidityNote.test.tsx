import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { LetterValidityNote } from './LetterValidityNote'

// 12 Desember 2026 23:59:59 WIB (akhir hari, seperti dicap backend).
const LAST_VALID = '2026-12-12T16:59:59Z'

describe('LetterValidityNote', () => {
  it('shows the last valid date in WIB regardless of the browser time zone', () => {
    render(<LetterValidityNote surat={{ expires_at: LAST_VALID, is_expired: false }} />)

    expect(screen.getByText('Berlaku sampai 12 Desember 2026')).toBeInTheDocument()
  })

  it('offers "Ajukan lagi" on an expired letter when the page provides a target', async () => {
    const user = userEvent.setup()
    const onReapply = vi.fn()
    render(
      <LetterValidityNote
        surat={{ expires_at: LAST_VALID, is_expired: true }}
        onReapply={onReapply}
      />,
    )

    expect(screen.getByText('Kedaluwarsa')).toBeInTheDocument()
    expect(screen.getByText(/habis pada 12 Desember 2026/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ajukan lagi' }))
    expect(onReapply).toHaveBeenCalledTimes(1)
  })

  it('hides "Ajukan lagi" while the letter is still valid', () => {
    render(
      <LetterValidityNote
        surat={{ expires_at: LAST_VALID, is_expired: false }}
        onReapply={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Ajukan lagi' })).toBeNull()
  })

  it('hides "Ajukan lagi" when the page gives no target', () => {
    render(<LetterValidityNote surat={{ expires_at: LAST_VALID, is_expired: true }} />)

    expect(screen.queryByRole('button', { name: 'Ajukan lagi' })).toBeNull()
  })
})
