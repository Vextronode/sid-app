import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OverdueBadge } from './OverdueBadge'

describe('OverdueBadge', () => {
  it('shows an overdue badge only when the backend flag is true', () => {
    const { rerender } = render(<OverdueBadge isOverdue />)

    expect(screen.getByText('Terlambat')).toBeInTheDocument()

    rerender(<OverdueBadge isOverdue={false} />)
    expect(screen.queryByText('Terlambat')).not.toBeInTheDocument()

    rerender(<OverdueBadge isOverdue={null} />)
    expect(screen.queryByText('Terlambat')).not.toBeInTheDocument()
  })

  it('shows an overdue count on dashboards', () => {
    render(<OverdueBadge isOverdue count={3} />)

    expect(screen.getByText('Terlambat · 3')).toBeInTheDocument()
  })
})
