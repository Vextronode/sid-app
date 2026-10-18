import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import EditPerangkatDesaModal from './EditPerangkatDesaModal'

// Referensi tetap, seperti dari halaman: array baru tiap render memicu ulang
// effect pemuatan data modal.
const NO_OFFICIALS = []

describe('EditPerangkatDesaModal', () => {
  it('explains in plain words where names and photos are changed', () => {
    render(
      <MemoryRouter>
        <EditPerangkatDesaModal
          open
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          initialPerangkat={NO_OFFICIALS}
          initialKadus={NO_OFFICIALS}
        />
      </MemoryRouter>,
    )

    const notice = screen.getByText(/tercatat di sistem/)
    expect(notice).not.toHaveTextContent(/backend/i)
    expect(screen.getByRole('link', { name: 'Pejabat Desa' })).toHaveAttribute(
      'href',
      '/admin/pejabat-desa',
    )
  })
})
