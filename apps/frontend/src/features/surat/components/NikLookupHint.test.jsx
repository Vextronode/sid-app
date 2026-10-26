import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { lookupNik } = vi.hoisted(() => ({ lookupNik: vi.fn() }))

vi.mock('../api/letterExtrasApi', () => ({ lookupNik }))

import { NikLookupHint } from './NikLookupHint'

describe('NikLookupHint', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the name from the population data once the NIK is complete', async () => {
    lookupNik.mockResolvedValue({
      found: true,
      name: 'Ujang Saksi',
      family_number: '3218010101900009',
    })
    const onResult = vi.fn()
    render(<NikLookupHint nik="3207010101800009" onResult={onResult} />)

    expect(await screen.findByText('Ujang Saksi')).toBeTruthy()
    expect(screen.getByText('3218010101900009')).toBeTruthy()
    expect(lookupNik).toHaveBeenCalledWith('3207010101800009')
    expect(onResult).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'found',
        name: 'Ujang Saksi',
        familyNumber: '3218010101900009',
      }),
    )
  })

  it('only shows a masked name when the NIK owner has to consent first', async () => {
    lookupNik.mockResolvedValue({
      found: true,
      has_account: true,
      name: 'U***g S***i',
      family_number: null,
    })
    const onResult = vi.fn()
    render(<NikLookupHint nik="3207010101800009" onResult={onResult} />)

    expect(await screen.findByText('U***g S***i')).toBeTruthy()
    expect(screen.getByText(/Persetujuan saksi akan diminta/)).toBeTruthy()
    expect(onResult).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'found', hasAccount: true }),
    )
  })

  it('asks for the name when the NIK is not registered', async () => {
    lookupNik.mockResolvedValue({ found: false, name: null })
    const onResult = vi.fn()
    render(<NikLookupHint nik="3207010101800099" onResult={onResult} />)

    expect(await screen.findByText(/Data NIK tidak ditemukan/)).toBeTruthy()
    await waitFor(() =>
      expect(onResult).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'not_found' })),
    )
  })

  it('does not search an incomplete NIK', () => {
    const onResult = vi.fn()
    render(<NikLookupHint nik="3207" onResult={onResult} />)

    expect(lookupNik).not.toHaveBeenCalled()
    expect(onResult).toHaveBeenCalledWith({ status: 'idle', name: '' })
  })
})
