import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { applyFulfillment, confirmDialog, previewFulfillment } = vi.hoisted(() => ({
  applyFulfillment: vi.fn(),
  confirmDialog: vi.fn(),
  previewFulfillment: vi.fn(),
}))

vi.mock('../api/letterExtrasApi', () => ({ applyFulfillment, previewFulfillment }))
vi.mock('@/shared/lib/dialog', () => ({ confirmDialog }))

import { UpdateCitizensForm } from './UpdateCitizensForm'

const proposal = {
  action: 'update_citizens',
  subjects: [
    {
      label: 'Suami',
      name: null,
      nik_masked: '************0005',
      found: false,
      fields: [],
    },
    {
      label: 'Istri',
      name: 'Euis Komariah',
      nik_masked: '************0002',
      found: true,
      fields: [
        { label: 'Status Perkawinan', current_label: 'Kawin', proposed_label: 'Cerai Hidup' },
      ],
    },
  ],
}

describe('UpdateCitizensForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    previewFulfillment.mockResolvedValue([
      {
        name: 'Euis Komariah',
        kind: 'update',
        changes: [{ label: 'Status Perkawinan', old: 'Kawin', new: 'Cerai Hidup' }],
      },
    ])
    applyFulfillment.mockResolvedValue({ message: 'ok' })
  })

  it('lists village residents and skips those not registered', () => {
    render(<UpdateCitizensForm letterId="l-1" proposal={proposal} onDone={vi.fn()} />)

    expect(screen.getByText(/Suami: tidak terdata di desa/)).toBeTruthy()
    expect(screen.getByText('Status Perkawinan: Kawin - Cerai Hidup')).toBeTruthy()
  })

  it('applies only after the change list is confirmed', async () => {
    confirmDialog.mockResolvedValue(true)
    const onDone = vi.fn()
    render(<UpdateCitizensForm letterId="l-1" proposal={proposal} onDone={onDone} />)

    fireEvent.click(screen.getByRole('button', { name: 'Terapkan' }))

    await waitFor(() => expect(applyFulfillment).toHaveBeenCalledWith('l-1', {}, null))
    expect(confirmDialog.mock.calls[0][0].details[0].rows).toEqual([
      { label: 'Status Perkawinan', from: 'Kawin', to: 'Cerai Hidup' },
    ])
    expect(onDone).toHaveBeenCalled()
  })

  it('does nothing when the confirmation is cancelled', async () => {
    confirmDialog.mockResolvedValue(false)
    render(<UpdateCitizensForm letterId="l-1" proposal={proposal} onDone={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Terapkan' }))

    await waitFor(() => expect(confirmDialog).toHaveBeenCalled())
    expect(applyFulfillment).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Terapkan' })).not.toBeDisabled()
  })
})
