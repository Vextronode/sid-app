import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { applyFulfillment, confirmDialog, previewFulfillment } = vi.hoisted(() => ({
  applyFulfillment: vi.fn(),
  confirmDialog: vi.fn(),
  previewFulfillment: vi.fn(),
}))

vi.mock('../api/letterExtrasApi', () => ({ applyFulfillment, previewFulfillment }))
vi.mock('@/shared/lib/dialog', () => ({ confirmDialog }))

import { SemiManualFulfillmentForm } from './SemiManualFulfillmentForm'

function renderForm(proposal, onDone = vi.fn()) {
  render(
    <MemoryRouter>
      <SemiManualFulfillmentForm letterId="l-1" proposal={proposal} onDone={onDone} />
    </MemoryRouter>,
  )

  return onDone
}

describe('SemiManualFulfillmentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    confirmDialog.mockResolvedValue(true)
    previewFulfillment.mockResolvedValue([])
    applyFulfillment.mockResolvedValue({ message: 'ok' })
  })

  it('marks manual changes done with the notes and links to the population page', async () => {
    const onDone = renderForm({
      action: 'manual',
      instructions: 'Perbarui susunan KK sesuai KK baru.',
    })

    expect(screen.getByText('Perbarui susunan KK sesuai KK baru.')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Data Penduduk/ })).toHaveAttribute(
      'href',
      '/admin/data-warga',
    )

    fireEvent.change(screen.getByLabelText('Catatan perubahan data'), {
      target: { value: 'KK baru sudah diinput' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Tandai selesai' }))

    await waitFor(() =>
      expect(applyFulfillment).toHaveBeenCalledWith('l-1', {}, null, 'KK baru sudah diinput'),
    )
    expect(onDone).toHaveBeenCalled()
  })

  it('lists the members to deactivate and skips those already inactive', () => {
    renderForm({
      action: 'deactivate_members',
      members: [
        {
          citizen_id: 'c-1',
          name: 'Anak Pindah',
          family_role: 'Anak',
          found: true,
          is_active: true,
        },
        { citizen_id: 'c-2', name: 'Istri', family_role: 'Istri', found: true, is_active: false },
      ],
    })

    expect(screen.getByText(/akan dinonaktifkan/)).toBeTruthy()
    expect(screen.getByText(/sudah nonaktif/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Nonaktifkan anggota' })).not.toBeDisabled()
  })

  it('shows who becomes the new family head', () => {
    renderForm({
      action: 'deactivate_members',
      members: [
        {
          citizen_id: 'c-1',
          name: 'Tatang',
          family_role: 'Kepala Keluarga',
          found: true,
          is_active: true,
        },
      ],
      new_head: { name: 'Iis Nurhayati', family_role: 'Istri' },
    })

    expect(screen.getByText(/menjadi kepala keluarga baru/)).toHaveTextContent('Iis Nurhayati')
  })

  it('cannot deactivate when no member is still active', () => {
    renderForm({
      action: 'deactivate_members',
      members: [
        { citizen_id: 'c-2', name: 'Istri', family_role: 'Istri', found: true, is_active: false },
      ],
    })

    expect(screen.getByRole('button', { name: 'Nonaktifkan anggota' })).toBeDisabled()
  })

  it('only marks done when the letter has no registered members (e.g. foreigners)', async () => {
    renderForm({
      action: 'deactivate_members',
      members: [],
      instructions: 'Untuk orang asing (SKTT), cukup tandai selesai.',
    })

    expect(screen.getByText(/cukup tandai selesai/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tandai selesai' }))

    await waitFor(() => expect(applyFulfillment).toHaveBeenCalledWith('l-1', {}, null, ''))
  })
})
