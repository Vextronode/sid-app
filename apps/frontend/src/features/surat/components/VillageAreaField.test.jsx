import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { VillageAreaField } from './VillageAreaField'

const areas = [
  {
    id: 1,
    name: 'Budiasih',
    rws: [
      {
        id: 10,
        number: '16',
        rts: [
          { id: 100, number: '1' },
          { id: 101, number: '2' },
        ],
      },
      { id: 11, number: '17', rts: [{ id: 110, number: '1' }] },
    ],
  },
  { id: 2, name: 'Sinargalih', rws: [{ id: 20, number: '6', rts: [{ id: 200, number: '1' }] }] },
]

const field = { name: 'alamat', label: 'Alamat di Desa Ini' }

describe('VillageAreaField', () => {
  it('narrows RW and RT choices by the chosen dusun and stores the RT id', () => {
    const setValue = vi.fn()
    render(
      <VillageAreaField field={field} value="" setValue={setValue} areas={areas} errors={{}} />,
    )

    expect(screen.getByLabelText('Alamat di Desa Ini - RW')).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Alamat di Desa Ini - Dusun'), {
      target: { value: '1' },
    })
    fireEvent.change(screen.getByLabelText('Alamat di Desa Ini - RW'), { target: { value: '10' } })

    const rt = screen.getByLabelText('Alamat di Desa Ini - RT')
    expect(Array.from(rt.options).map((option) => option.textContent)).toEqual([
      'Pilih RT...',
      'RT 1',
      'RT 2',
    ])

    fireEvent.change(rt, { target: { value: '101' } })
    expect(setValue).toHaveBeenLastCalledWith('alamat', '101', expect.anything())
  })

  it('restores dusun and RW from an RT chosen earlier', () => {
    render(
      <VillageAreaField field={field} value="200" setValue={vi.fn()} areas={areas} errors={{}} />,
    )

    expect(screen.getByLabelText('Alamat di Desa Ini - Dusun')).toHaveValue('2')
    expect(screen.getByLabelText('Alamat di Desa Ini - RW')).toHaveValue('20')
    expect(screen.getByLabelText('Alamat di Desa Ini - RT')).toHaveValue('200')
  })
})
