import type { ComponentProps } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { applyFulfillment, confirmDialog, getFulfillmentProposal, previewFulfillment } = vi.hoisted(
  () => ({
    applyFulfillment: vi.fn(),
    confirmDialog: vi.fn(),
    getFulfillmentProposal: vi.fn(),
    previewFulfillment: vi.fn(),
  }),
)

vi.mock('../api/letterExtrasApi', () => ({
  applyFulfillment,
  getFulfillmentProposal,
  previewFulfillment,
}))
vi.mock('@/shared/lib/dialog', () => ({ confirmDialog }))

import { FulfillmentPanel } from './FulfillmentPanel'

const newCitizen = (nik) => ({
  action: 'create_citizen',
  fulfilled_at: null,
  family: { mode: 'join', description: 'Masuk ke No. KK ************0001.' },
  fields: [
    { column: 'nik', label: 'NIK', proposed: nik, proposed_label: nik ?? '-', fixed: false },
    {
      column: 'gender',
      label: 'Jenis Kelamin',
      proposed: 'P',
      proposed_label: 'Perempuan',
      fixed: false,
      options: [
        { value: 'L', label: 'Laki-laki' },
        { value: 'P', label: 'Perempuan' },
      ],
    },
  ],
})

const renderPanel = (props: Partial<ComponentProps<typeof FulfillmentPanel>> = {}) =>
  render(
    <MemoryRouter>
      <FulfillmentPanel letterId="l-1" onApplied={vi.fn()} {...props} />
    </MemoryRouter>,
  )

describe('FulfillmentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    previewFulfillment.mockResolvedValue([])
    confirmDialog.mockResolvedValue(false)
  })

  it('corrects coded columns through labelled options', async () => {
    getFulfillmentProposal.mockResolvedValue(newCitizen('3207014504210003'))
    renderPanel()

    const gender = await screen.findByLabelText('Nilai diterapkan untuk Jenis Kelamin')
    expect(gender).toHaveValue('P')
    expect(screen.getByRole('option', { name: 'Laki-laki' })).toBeTruthy()
    expect(screen.getByText('Masuk ke No. KK ************0001.')).toBeTruthy()
  })

  it('opens the change confirmation right after the result is accepted', async () => {
    getFulfillmentProposal.mockResolvedValue({
      action: 'deactivate_members',
      fulfilled_at: null,
      members: [
        {
          citizen_id: 'c-1',
          name: 'Tatang',
          family_role: 'Kepala Keluarga',
          found: true,
          is_active: true,
        },
      ],
      fields: [],
    })
    renderPanel({ autoStart: true })

    await waitFor(() => expect(previewFulfillment).toHaveBeenCalledWith('l-1', {}, null, ''))
    expect(confirmDialog).toHaveBeenCalled()
    expect(applyFulfillment).not.toHaveBeenCalled()
  })

  it('asks for the NIK first instead of starting when it is still empty', async () => {
    getFulfillmentProposal.mockResolvedValue(newCitizen(null))
    renderPanel({ autoStart: true })

    expect(await screen.findByText(/Isi NIK\/No. KK dari dokumen terbitan/)).toBeTruthy()
    expect(previewFulfillment).not.toHaveBeenCalled()
  })
})
