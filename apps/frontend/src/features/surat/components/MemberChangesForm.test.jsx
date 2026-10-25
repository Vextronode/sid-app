import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { applyFulfillment, confirmDialog } = vi.hoisted(() => ({
  applyFulfillment: vi.fn(),
  confirmDialog: vi.fn(),
}))

vi.mock('../api/letterExtrasApi', () => ({ applyFulfillment }))
vi.mock('@/shared/lib/dialog', () => ({ confirmDialog }))

import { MemberChangesForm } from './MemberChangesForm'

const proposal = {
  action: 'update_members',
  options: {
    marital_status: [
      { value: 'belum_kawin', label: 'Belum Kawin' },
      { value: 'kawin', label: 'Kawin' },
    ],
    occupation_id: [
      { value: 7, label: 'Petani' },
      { value: 9, label: 'Buruh Harian Lepas' },
    ],
  },
  member_changes: [
    {
      index: 0,
      citizen_id: 'c-1',
      name: 'Alief',
      found: true,
      fields: [
        {
          column: 'marital_status',
          label: 'Status Perkawinan',
          current_label: 'Belum Kawin',
          proposed: 'kawin',
          proposed_label: 'Kawin',
          needs_choice: false,
        },
        {
          column: 'occupation_id',
          label: 'Pekerjaan',
          current_label: 'Petani',
          proposed: null,
          proposed_label: 'Buruh Harian Lepas',
          needs_choice: true,
        },
      ],
    },
  ],
}

describe('MemberChangesForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    confirmDialog.mockResolvedValue(true)
    applyFulfillment.mockResolvedValue({ message: 'ok' })
  })

  it('prefills proposals and lets Kasi pick an occupation that is not in the catalog yet', async () => {
    const onDone = vi.fn()
    render(<MemberChangesForm letterId="l-1" proposal={proposal} onDone={onDone} />)

    expect(screen.getByLabelText('Status Perkawinan Alief')).toHaveValue('kawin')
    expect(screen.getByText(/belum ada di katalog/)).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Pekerjaan Alief'), { target: { value: '9' } })
    fireEvent.click(screen.getByRole('button', { name: 'Terapkan' }))

    await waitFor(() =>
      expect(applyFulfillment).toHaveBeenCalledWith(
        'l-1',
        { 0: { marital_status: 'kawin', occupation_id: '9' } },
        null,
      ),
    )
    expect(onDone).toHaveBeenCalled()
  })

  it('warns when an occupation is left unchosen', async () => {
    render(<MemberChangesForm letterId="l-1" proposal={proposal} onDone={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Terapkan' }))

    await waitFor(() => expect(confirmDialog).toHaveBeenCalled())
    expect(confirmDialog.mock.calls[0][0].message).toMatch(/1 kolom pekerjaan belum dipilih/)
    await waitFor(() =>
      expect(applyFulfillment).toHaveBeenCalledWith(
        'l-1',
        { 0: { marital_status: 'kawin' } },
        null,
      ),
    )
  })
})
