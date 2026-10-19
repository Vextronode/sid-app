import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import RtTable from './RtTable'

const HAMLETS = [
  { id: 1, name: 'Krajan' },
  { id: 2, name: 'Sukamaju' },
]

const RWS = [
  { id: 10, number: '01', hamletId: 1 },
  { id: 11, number: '02', hamletId: 1 },
  { id: 20, number: '03', hamletId: 2 },
]

const RTS = [
  { id: 100, number: '01', rwId: 10, fullLabel: 'RT 001', isActive: true },
  { id: 101, number: '02', rwId: 11, fullLabel: 'RT 002', isActive: true },
  { id: 200, number: '03', rwId: 20, fullLabel: 'RT 003', isActive: true },
]

function renderTable() {
  render(
    <RtTable
      rts={RTS}
      rws={RWS}
      hamlets={HAMLETS}
      processing={null}
      onEdit={vi.fn()}
      onToggle={vi.fn()}
      onDelete={vi.fn()}
    />,
  )
}

const optionLabels = (select) => [...select.options].map((option) => option.textContent)
const rowCount = () => screen.getAllByRole('row').length - 1

describe('RtTable', () => {
  it('narrows RW choices and RT rows to the chosen hamlet', () => {
    renderTable()

    const hamletSelect = screen.getByRole('combobox', { name: 'Filter dusun' })
    const rwSelect = screen.getByRole('combobox', { name: 'Filter RW' })

    expect(rowCount()).toBe(3)

    fireEvent.change(hamletSelect, { target: { value: '1' } })

    expect(optionLabels(rwSelect)).toEqual(['Semua RW', 'RW 01', 'RW 02'])
    expect(rowCount()).toBe(2)

    fireEvent.change(rwSelect, { target: { value: '11' } })

    expect(rowCount()).toBe(1)
    expect(within(screen.getAllByRole('row')[1]).getByText('RT 02')).toBeTruthy()
  })

  it('clears the RW choice when the hamlet changes', () => {
    renderTable()

    const hamletSelect = screen.getByRole('combobox', { name: 'Filter dusun' })
    const rwSelect = screen.getByRole('combobox', { name: 'Filter RW' })

    fireEvent.change(hamletSelect, { target: { value: '1' } })
    fireEvent.change(rwSelect, { target: { value: '10' } })
    fireEvent.change(hamletSelect, { target: { value: '2' } })

    expect(rwSelect.value).toBe('')
    expect(optionLabels(rwSelect)).toEqual(['Semua RW', 'RW 03'])
    expect(rowCount()).toBe(1)
  })
})
