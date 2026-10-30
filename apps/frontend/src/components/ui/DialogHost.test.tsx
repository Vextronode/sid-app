import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { DialogHost } from './DialogHost'
import {
  alertDialog,
  confirmDialog,
  currentDialog,
  promptDialog,
  resolveDialog,
} from '@/shared/lib/dialog'

describe('DialogHost', () => {
  afterEach(() => {
    act(() => {
      while (currentDialog()) resolveDialog(undefined)
    })
  })

  it('shows an alert card and resolves when closed', async () => {
    const user = userEvent.setup()
    render(<DialogHost />)

    let done = false
    act(() => {
      alertDialog({ title: 'Gagal', message: 'Server sibuk' }).then(() => (done = true))
    })

    expect(screen.getByRole('alertdialog', { name: 'Gagal' })).toHaveTextContent('Server sibuk')
    await user.click(screen.getByRole('button', { name: 'Tutup' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(done).toBe(true)
  })

  it('resolves confirm with true or false', async () => {
    const user = userEvent.setup()
    render(<DialogHost />)

    let first
    act(() => {
      first = confirmDialog({ title: 'Hapus RT 01?', confirmLabel: 'Hapus' })
    })
    await user.click(screen.getByRole('button', { name: 'Hapus' }))
    await expect(first).resolves.toBe(true)

    let second
    act(() => {
      second = confirmDialog({ title: 'Hapus RT 02?', confirmLabel: 'Hapus' })
    })
    await user.keyboard('{Escape}')
    await expect(second).resolves.toBe(false)
  })

  it('lists the changes to confirm, without the old column for new records', async () => {
    const user = userEvent.setup()
    render(<DialogHost />)

    let answer
    act(() => {
      answer = confirmDialog({
        title: 'Konfirmasi perubahan data',
        confirmLabel: 'Konfirmasi',
        details: [
          {
            title: 'Euis (diubah)',
            rows: [{ label: 'Status Perkawinan', from: 'Kawin', to: 'Cerai Hidup' }],
          },
          {
            title: 'Rosita (warga baru)',
            showOld: false,
            rows: [{ label: 'Nama', from: '-', to: 'Rosita' }],
          },
        ],
      })
    })

    const changed = screen.getByRole('region', { name: 'Euis (diubah)' })
    expect(changed).toHaveTextContent('Lama')
    expect(changed).toHaveTextContent('Status PerkawinanKawinCerai Hidup')
    const created = screen.getByRole('region', { name: 'Rosita (warga baru)' })
    expect(created).not.toHaveTextContent('Lama')
    expect(created).toHaveTextContent('NamaRosita')

    await user.click(screen.getByRole('button', { name: 'Konfirmasi' }))
    await expect(answer).resolves.toBe(true)
  })

  it('validates prompt input length before resolving the trimmed text', async () => {
    const user = userEvent.setup()
    render(<DialogHost />)

    let answer
    act(() => {
      answer = promptDialog({
        title: 'Reset tanda tangan?',
        label: 'Alasan',
        minLength: 5,
        confirmLabel: 'Reset',
      })
    })

    await user.type(screen.getByRole('textbox', { name: 'Alasan' }), 'abc')
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByText('Isian minimal 5 karakter.')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Alasan' }), ' salah  ')
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    await expect(answer).resolves.toBe('abc salah')
  })
})
