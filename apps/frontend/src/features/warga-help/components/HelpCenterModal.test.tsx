import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const info = vi.hoisted(() => ({ village: null as Record<string, unknown> | null }))
vi.mock('@/features/info-desa/usePublicVillageInfo', () => ({
  usePublicVillageInfo: () => info,
}))

import HelpCenterModal from './HelpCenterModal'
import { present } from '@/test/fixtures'

describe('HelpCenterModal', () => {
  it('shows the village contacts from the API, phone and email as links', () => {
    info.village = {
      phone: '(0265) 2640613',
      email: 'kantor@desa.test',
      address: 'Jl. Raya Desa',
      office_hours: 'Senin – Jumat, 08.00 – 15.00 WIB',
    }
    render(<HelpCenterModal open onClose={() => {}} />)

    expect(screen.getByRole('link', { name: '(0265) 2640613' })).toHaveAttribute(
      'href',
      'tel:02652640613',
    )
    expect(screen.getByRole('link', { name: 'kantor@desa.test' })).toHaveAttribute(
      'href',
      'mailto:kantor@desa.test',
    )
    expect(screen.getByText('Jl. Raya Desa')).toBeInTheDocument()
    expect(screen.getByText('Senin – Jumat, 08.00 – 15.00 WIB')).toBeInTheDocument()
  })

  it('never shows a hard-coded village identity while data is missing', () => {
    info.village = null
    render(<HelpCenterModal open onClose={() => {}} />)

    expect(screen.queryByText(/cibenda/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/0812|3456/)).not.toBeInTheDocument()
    expect(screen.getAllByText('-')).toHaveLength(4)
  })

  it('closes on Escape and on a backdrop click, not on a click inside', () => {
    info.village = null
    const onClose = vi.fn()
    render(<HelpCenterModal open onClose={onClose} />)

    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(present(screen.getByRole('dialog').parentElement))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
