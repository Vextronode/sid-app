import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ToastHost } from '@/components/ui/ToastHost'
import { currentToasts, dismissToast, notify, notifySuccess } from './toast'

describe('toast', () => {
  afterEach(() => {
    vi.useRealTimers()
    act(() => currentToasts().forEach((toast) => dismissToast(toast.id)))
  })

  it('shows a success toast that disappears on its own', () => {
    vi.useFakeTimers()
    render(<ToastHost />)

    act(() => {
      notifySuccess('Data warga berhasil disimpan.')
    })
    expect(screen.getByRole('status')).toHaveTextContent('Data warga berhasil disimpan.')

    act(() => vi.advanceTimersByTime(3100))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('can be closed manually', async () => {
    const user = userEvent.setup()
    render(<ToastHost />)

    act(() => {
      notifySuccess('Berita berhasil dihapus.')
    })
    await user.click(screen.getByRole('button', { name: 'Tutup notifikasi' }))

    expect(screen.queryByText('Berita berhasil dihapus.')).not.toBeInTheDocument()
  })

  it('keeps at most three toasts', () => {
    for (const message of ['satu', 'dua', 'tiga', 'empat']) notify({ message })

    expect(currentToasts().map((toast) => toast.message)).toEqual(['dua', 'tiga', 'empat'])
  })
})
