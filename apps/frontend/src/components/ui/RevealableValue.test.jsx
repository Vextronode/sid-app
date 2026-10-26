import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { RevealableValue } from './RevealableValue'

describe('RevealableValue', () => {
  it('fetches the full value once and toggles between masked and full', async () => {
    const reveal = vi.fn().mockResolvedValue('3207010101800001')
    render(<RevealableValue masked="************0001" reveal={reveal} />)

    expect(screen.getByText('************0001')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Tampilkan NIK' }))
    expect(await screen.findByText('3207010101800001')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Sembunyikan NIK' }))
    expect(screen.getByText('************0001')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Tampilkan NIK' }))
    expect(await screen.findByText('3207010101800001')).toBeTruthy()
    expect(reveal).toHaveBeenCalledTimes(1)
  })

  it('keeps the masked value when the backend refuses', async () => {
    const reveal = vi.fn().mockRejectedValue(new Error('403'))
    render(<RevealableValue masked="************0002" reveal={reveal} label="No. KK" />)

    fireEvent.click(screen.getByRole('button', { name: 'Tampilkan No. KK' }))

    expect(await screen.findByTitle('No. KK tidak dapat ditampilkan')).toBeTruthy()
    expect(screen.getByText('************0002')).toBeTruthy()
  })

  it('shows a dash without a value', () => {
    render(<RevealableValue masked={null} reveal={vi.fn()} />)

    expect(screen.getByText('-')).toBeTruthy()
  })
})
