import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getTermStatus } from '@/features/profil-desa-admin/utils/termStatus'

import { TermEndBadge } from './TermEndBadge'

const TODAY = new Date(2026, 9, 19, 15, 30)

describe('getTermStatus', () => {
  it('marks a term that ended yesterday as expired', () => {
    expect(getTermStatus('2026-10-18', TODAY)).toEqual({ type: 'expired', daysLeft: -1 })
  })

  it('marks terms ending today through 30 days ahead as ending', () => {
    expect(getTermStatus('2026-10-19T00:00:00.000000Z', TODAY)).toEqual({
      type: 'ending',
      daysLeft: 0,
    })
    expect(getTermStatus('2026-11-18', TODAY)).toEqual({ type: 'ending', daysLeft: 30 })
  })

  it('ignores terms further away or without an end date', () => {
    expect(getTermStatus('2026-11-19', TODAY)).toBeNull()
    expect(getTermStatus(null, TODAY)).toBeNull()
  })
})

describe('TermEndBadge', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(TODAY)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the expired and remaining-days labels', () => {
    const { rerender } = render(<TermEndBadge termEndsAt="2026-10-01" />)
    expect(screen.getByText('Lewat masa')).toBeInTheDocument()

    rerender(<TermEndBadge termEndsAt="2026-10-24" />)
    expect(screen.getByText('5 hari lagi')).toBeInTheDocument()
  })

  it('renders nothing when the term is not ending soon', () => {
    const { container } = render(<TermEndBadge termEndsAt="2027-01-01" />)
    expect(container).toBeEmptyDOMElement()
  })
})
