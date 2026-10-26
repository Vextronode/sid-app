import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { applyFulfillment, confirmDialog, previewFulfillment } = vi.hoisted(() => ({
  applyFulfillment: vi.fn(),
  confirmDialog: vi.fn(),
  previewFulfillment: vi.fn(),
}))

vi.mock('../api/letterExtrasApi', () => ({ applyFulfillment, previewFulfillment }))
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
    previewFulfillment.mockResolvedValue([])
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

  it('warns when an occupation is left unchosen and confirms the server preview', async () => {
    previewFulfillment.mockResolvedValue([
      {
        name: 'Alief',
        kind: 'update',
        changes: [{ label: 'Status Perkawinan', old: 'Belum Kawin', new: 'Kawin' }],
      },
    ])
    render(<MemberChangesForm letterId="l-1" proposal={proposal} onDone={vi.fn()} />)

    expect(screen.getByText(/1 kolom pekerjaan belum dipilih/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Terapkan' }))

    await waitFor(() => expect(confirmDialog).toHaveBeenCalled())
    expect(previewFulfillment).toHaveBeenCalledWith(
      'l-1',
      { 0: { marital_status: 'kawin' } },
      null,
      null,
    )
    expect(confirmDialog.mock.calls[0][0].details).toEqual([
      {
        title: 'Alief (diubah)',
        showOld: true,
        rows: [{ label: 'Status Perkawinan', from: 'Belum Kawin', to: 'Kawin' }],
      },
    ])
    await waitFor(() =>
      expect(applyFulfillment).toHaveBeenCalledWith(
        'l-1',
        { 0: { marital_status: 'kawin' } },
        null,
      ),
    )
  })
})
