import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ImportConflictDialog } from './ImportConflictDialog'
import type { CitizenImportConflict } from '../hooks/useWargaList'

const conflicts: CitizenImportConflict[] = [
  {
    row: 12,
    citizen_id: 'c-1',
    name: 'Asep Saepul',
    moves_family: false,
    changes: [
      { field: 'name', label: 'Nama', before: 'Asep', after: 'Asep Saepul' },
      { field: 'rt_id', label: 'RT/RW', before: 'RT 001 / RW 001', after: 'RT 002 / RW 003' },
    ],
  },
  {
    row: 48,
    citizen_id: 'c-2',
    name: 'Euis Komalasari',
    moves_family: true,
    changes: [
      { field: 'no_kk', label: 'No. KK', before: '************0001', after: '************0002' },
    ],
  },
  { row: 103, citizen_id: 'c-3', name: 'Dede Rohman', moves_family: false, changes: [] },
]

function renderDialog(items = conflicts, newCount = 5) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  const onClose = vi.fn()
  render(
    <ImportConflictDialog
      conflicts={items}
      newCount={newCount}
      errorCount={1}
      onCancel={onCancel}
      onClose={onClose}
      onConfirm={onConfirm}
    />,
  )

  const rowOf = (name: string) => screen.getByText(name).closest('tr')!

  return { onConfirm, onCancel, onClose, rowOf }
}

describe('ImportConflictDialog', () => {
  it('skips every conflict by default and auto-skips identical rows', () => {
    const { onConfirm, rowOf } = renderDialog()

    expect(
      screen.getByRole('heading', { name: 'Ditemukan 3 warga yang NIK-nya sudah terdaftar' }),
    ).toBeTruthy()
    expect(within(rowOf('Dede Rohman')).getByText('Tidak ada perubahan')).toBeTruthy()
    expect(within(rowOf('Dede Rohman')).queryByRole('radio')).toBeNull()
    expect(within(rowOf('Euis Komalasari')).getByText('Pindah KK')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan impor' }))
    expect(onConfirm).toHaveBeenCalledWith([])
  })

  it('applies bulk choices and per-row exceptions', () => {
    const { onConfirm, rowOf } = renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Timpa semua (2)' }))
    expect(screen.getByText(/Timpa:/).textContent).toContain('Timpa: 2 · Lewati: 1')

    fireEvent.click(within(rowOf('Euis Komalasari')).getByRole('radio', { name: 'Lewati' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan impor' }))
    expect(onConfirm).toHaveBeenLastCalledWith([12])

    fireEvent.click(screen.getByRole('button', { name: 'Lewati semua (2)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan impor' }))
    expect(onConfirm).toHaveBeenLastCalledWith([])
  })

  it('shows the before and after values of a row on demand', () => {
    renderDialog()

    const toggle = screen.getByRole('button', { name: 'Nama, RT/RW' })
    expect(screen.queryByText('RT 002 / RW 003')).toBeNull()

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const detail = screen.getByText('RT 002 / RW 003').closest('tr')!
    expect(within(detail).getByText('RT 001 / RW 001')).toBeTruthy()
  })

  it('explains that nothing needs overwriting when every row is identical', () => {
    const identical = conflicts.map((conflict) => ({
      ...conflict,
      changes: [],
      moves_family: false,
    }))
    const { onClose, onConfirm } = renderDialog(identical, 0)

    expect(screen.getByRole('status').textContent).toContain('sama persis')
    expect(screen.queryByRole('button', { name: /Timpa semua/ })).toBeNull()

    // Tidak ada warga baru maupun perubahan: tutup tanpa menjalankan impor.
    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }))
    expect(onClose).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('still imports new citizens when the conflicts are all identical', () => {
    const identical = conflicts.map((conflict) => ({
      ...conflict,
      changes: [],
      moves_family: false,
    }))
    const { onConfirm } = renderDialog(identical, 4)

    expect(screen.getByRole('status').textContent).toContain('4 warga baru tetap ditambahkan')
    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan impor' }))
    expect(onConfirm).toHaveBeenCalledWith([])
  })

  it('cancels without choosing', () => {
    const { onCancel, onConfirm } = renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Batal' }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(2)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
