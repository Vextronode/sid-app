import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  createOfficialPositionType: vi.fn(),
  deleteOfficialPositionType: vi.fn(),
  updateOfficialPositionType: vi.fn(),
}))

vi.mock('../api', () => api)

import OfficialPositionTypeManager from './OfficialPositionTypeManager'

describe('OfficialPositionTypeManager', () => {
  it('shows a duplicate name rejection as an error card', async () => {
    const user = userEvent.setup()
    api.createOfficialPositionType.mockRejectedValue({
      response: {
        data: { errors: { label: ['Nama jabatan ini sudah dipakai. Gunakan nama lain.'] } },
      },
    })
    render(<OfficialPositionTypeManager types={[]} onChanged={vi.fn()} onClose={vi.fn()} />)

    await user.type(screen.getByRole('textbox', { name: /Nama jabatan/ }), 'Ketua RT')
    await user.click(screen.getByRole('button', { name: 'Tambah Jabatan' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Nama jabatan ini sudah dipakai. Gunakan nama lain.')
    expect(alert).toHaveClass('sid-admin-alert', 'sid-admin-alert-error')
  })
})
