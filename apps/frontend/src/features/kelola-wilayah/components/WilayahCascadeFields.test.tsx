import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ getHamlets: vi.fn(), getRws: vi.fn(), getRts: vi.fn() }))

vi.mock('../api', () => api)

import { WilayahCascadeFields } from './WilayahCascadeFields'
import { EMPTY_WILAYAH_CASCADE } from '../hooks/useWilayahCascade'
import type { WilayahCascadeValue } from '../hooks/useWilayahCascade'

const onChange = vi.fn()

function Harness({ initial = EMPTY_WILAYAH_CASCADE }: { initial?: WilayahCascadeValue }) {
  const [value, setValue] = useState(initial)

  return (
    <WilayahCascadeFields
      depth="rt"
      idPrefix="uji"
      value={value}
      onChange={(next) => {
        onChange(next)
        setValue(next)
      }}
      isTaken={(level, id) => level === 'rt' && id === 31}
      renderField={({ id, label, control }) => (
        <label key={id} htmlFor={id}>
          {label}
          {control}
        </label>
      )}
    />
  )
}

describe('WilayahCascadeFields', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getHamlets.mockResolvedValue({
      data: {
        data: [
          { id: 1, name: 'Patrol', is_active: true },
          { id: 2, name: 'Lama', is_active: false },
        ],
      },
    })
    api.getRws.mockResolvedValue({ data: { data: [{ id: 11, number: '002', is_active: true }] } })
    api.getRts.mockResolvedValue({
      data: {
        data: [
          { id: 30, number: '001', is_active: true },
          { id: 31, number: '002', is_active: true },
        ],
      },
    })
  })

  it('fetches RW for the chosen dusun and RT for the chosen RW', async () => {
    render(<Harness />)

    const rw = screen.getByLabelText('RW') as HTMLSelectElement
    expect(rw.disabled).toBe(true)
    // Dusun nonaktif tidak ditawarkan.
    await screen.findByRole('option', { name: 'Patrol' })
    expect(screen.queryByRole('option', { name: 'Lama' })).toBeNull()

    fireEvent.change(screen.getByLabelText('Dusun'), { target: { value: '1' } })
    await waitFor(() => expect(api.getRws).toHaveBeenCalledWith({ hamlet_id: '1' }))
    await screen.findByRole('option', { name: 'RW 002' })

    fireEvent.change(rw, { target: { value: '11' } })
    await waitFor(() => expect(api.getRts).toHaveBeenCalledWith({ rw_id: '11' }))
    expect(await screen.findByRole('option', { name: 'RT 002 (sudah ada)' })).toHaveProperty(
      'disabled',
      true,
    )

    fireEvent.change(screen.getByLabelText('RT'), { target: { value: '30' } })
    expect(onChange).toHaveBeenLastCalledWith({ hamletId: '1', rwId: '11', rtId: '30' })
  })

  it('clears lower levels when a higher level changes', async () => {
    render(<Harness initial={{ hamletId: '1', rwId: '11', rtId: '30' }} />)
    await screen.findByRole('option', { name: 'RT 001' })

    fireEvent.change(screen.getByLabelText('Dusun'), { target: { value: '' } })

    expect(onChange).toHaveBeenLastCalledWith({ hamletId: '', rwId: '', rtId: '' })
  })
})
