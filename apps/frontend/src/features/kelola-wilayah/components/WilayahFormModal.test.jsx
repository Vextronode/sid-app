import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { confirmDialog, notifySuccess } = vi.hoisted(() => ({
  confirmDialog: vi.fn(),
  notifySuccess: vi.fn(),
}))
vi.mock('@/shared/lib/dialog', () => ({ confirmDialog, currentDialog: () => null }))
vi.mock('@/shared/lib/toast', () => ({ notifySuccess }))

import WilayahFormModal from './WilayahFormModal'

const hamlet = { id: 1, name: 'Krajan', code: 'KRJ', isActive: true }

const renderModal = (props = {}) =>
  render(
    <WilayahFormModal
      open
      type="dusun"
      item={hamlet}
      hamlets={[]}
      rws={[]}
      processing={null}
      error=""
      onClose={vi.fn()}
      onSubmit={vi.fn().mockResolvedValue(true)}
      {...props}
    />,
  )

describe('WilayahFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('closes without asking when nothing changed', async () => {
    const onClose = vi.fn()
    renderModal({ onClose })

    await userEvent.click(screen.getByRole('button', { name: 'Batal' }))

    expect(confirmDialog).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('asks before discarding an edited name', async () => {
    confirmDialog.mockResolvedValue(false)
    const onClose = vi.fn()
    renderModal({ onClose })

    await userEvent.type(screen.getByDisplayValue('Krajan'), ' Baru')
    await userEvent.click(screen.getByRole('button', { name: 'Batal' }))

    expect(confirmDialog).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Buang perubahan?' }),
    )
    expect(onClose).not.toHaveBeenCalled()
  })

  it('saves only the editable fields (status moved to the table button) and shows a toast', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    renderModal({ onSubmit })

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Krajan' }))
    expect(confirmDialog).not.toHaveBeenCalled()
    expect(notifySuccess).toHaveBeenCalledWith('Dusun berhasil diperbarui.')
  })
})
