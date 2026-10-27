import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { applyFulfillment, confirmDialog, previewFulfillment } = vi.hoisted(() => ({
  applyFulfillment: vi.fn(),
  confirmDialog: vi.fn(),
  previewFulfillment: vi.fn(),
}))

vi.mock('../api/letterExtrasApi', () => ({ applyFulfillment, previewFulfillment }))
vi.mock('@/shared/lib/dialog', () => ({ confirmDialog }))

import { RestructureFamilyForm } from './RestructureFamilyForm'

const proposal = {
  action: 'restructure_family',
  restructure: {
    kind: 'new_family',
    lines: [
      'Dibuatkan KK baru di Dusun Cikawung, RT 001 / RW 003:',
      'Dadan Ramdani: Kepala Keluarga',
    ],
  },
  fields: [{ column: 'no_kk', label: 'No. KK Baru' }],
}

describe('RestructureFamilyForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    previewFulfillment.mockResolvedValue([])
    confirmDialog.mockResolvedValue(true)
    applyFulfillment.mockResolvedValue({ message: 'ok' })
  })

  it('shows the plan and applies with the new family number after confirmation', async () => {
    const onDone = vi.fn()
    render(<RestructureFamilyForm letterId="l-1" proposal={proposal} onDone={onDone} />)

    expect(screen.getByText('Dadan Ramdani: Kepala Keluarga')).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/No. KK Baru/), {
      target: { value: '3218011304159999' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Terapkan' }))

    await waitFor(() =>
      expect(applyFulfillment).toHaveBeenCalledWith('l-1', { no_kk: '3218011304159999' }, null),
    )
    expect(previewFulfillment).toHaveBeenCalledWith(
      'l-1',
      { no_kk: '3218011304159999' },
      null,
      null,
    )
    expect(onDone).toHaveBeenCalled()
  })

  it('does not ask for a number when no new family is made', () => {
    render(
      <RestructureFamilyForm
        letterId="l-1"
        proposal={{
          ...proposal,
          fields: [],
          restructure: { kind: 'change_head', lines: ['Dadan menjadi Kepala Keluarga.'] },
        }}
        onDone={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText(/No. KK Baru/)).toBeNull()
  })
})
