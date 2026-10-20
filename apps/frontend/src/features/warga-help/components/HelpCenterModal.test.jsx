import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const info = vi.hoisted(() => ({ village: null }))
vi.mock('@/features/info-desa/usePublicVillageInfo', () => ({
  usePublicVillageInfo: () => info,
}))

import HelpCenterModal from './HelpCenterModal'

describe('HelpCenterModal', () => {
  it('shows the village contacts from the API, phone and email grouped together', () => {
    info.village = {
      phone: '(0265) 2640613',
      email: 'kantor@desa.test',
      address: 'Jl. Raya Desa',
      office_hours: 'Senin – Jumat, 08.00 – 15.00 WIB',
    }
    const { container } = render(<HelpCenterModal open onClose={() => {}} />)

    const group = container.querySelector('.sid-help-contact-group')
    expect(group).toHaveTextContent('(0265) 2640613')
    expect(group).toHaveTextContent('kantor@desa.test')
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
})
