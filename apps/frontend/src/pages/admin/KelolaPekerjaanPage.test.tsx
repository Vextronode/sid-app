import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getOccupations: vi.fn(),
  createOccupation: vi.fn(),
  updateOccupation: vi.fn(),
  deleteOccupation: vi.fn(),
}))
const { confirmDialog, notifySuccess } = vi.hoisted(() => ({
  confirmDialog: vi.fn(),
  notifySuccess: vi.fn(),
}))

vi.mock('@/features/pekerjaan/api', () => api)
vi.mock('@/components/layout/SiteFooter', () => ({ SiteFooter: (): null => null }))
vi.mock('@/shared/lib/dialog', () => ({ confirmDialog, currentDialog: (): null => null }))
vi.mock('@/shared/lib/toast', () => ({ notifySuccess }))

import KelolaPekerjaanPage from './KelolaPekerjaanPage'

const PETANI = { id: 1, name: 'Petani', sort_order: 1, is_active: true, citizens_count: 3 }

describe('KelolaPekerjaanPage status toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getOccupations.mockResolvedValue({ data: { data: [PETANI] } })
    api.updateOccupation.mockResolvedValue({})
  })

  it('deactivates from its own row button after confirmation', async () => {
    confirmDialog.mockResolvedValue(true)
    const user = userEvent.setup()
    render(<KelolaPekerjaanPage />)

    const row = (await screen.findByText('Petani')).closest('tr')
    await user.click(within(row).getByRole('button', { name: 'Nonaktifkan Petani' }))

    expect(confirmDialog).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Nonaktifkan pekerjaan "Petani"?' }),
    )
    await waitFor(() => expect(api.updateOccupation).toHaveBeenCalledWith(1, { is_active: false }))
    expect(notifySuccess).toHaveBeenCalledWith('Pekerjaan "Petani" berhasil dinonaktifkan.')
  })

  it('keeps the status when the confirmation is cancelled', async () => {
    confirmDialog.mockResolvedValue(false)
    const user = userEvent.setup()
    render(<KelolaPekerjaanPage />)

    const row = (await screen.findByText('Petani')).closest('tr')
    await user.click(within(row).getByRole('button', { name: 'Nonaktifkan Petani' }))

    expect(api.updateOccupation).not.toHaveBeenCalled()
  })

  it('no longer has a status checkbox in the edit form', async () => {
    const user = userEvent.setup()
    render(<KelolaPekerjaanPage />)

    const row = (await screen.findByText('Petani')).closest('tr')
    await user.click(within(row).getByRole('button', { name: 'Edit Pekerjaan' }))

    expect(screen.getByLabelText('Nama Pekerjaan')).toHaveValue('Petani')
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})
