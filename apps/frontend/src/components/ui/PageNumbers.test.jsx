import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PageNumbers } from './PageNumbers'
import { getPageWindow } from './pageWindow'

describe('getPageWindow', () => {
  it('shows the first three pages and a trailing ellipsis on page 1', () => {
    expect(getPageWindow(1, 17)).toEqual([1, 2, 3, 'ellipsis-end'])
  })

  it('shows previous, current, and next pages between ellipses in the middle', () => {
    expect(getPageWindow(5, 17)).toEqual(['ellipsis-start', 4, 5, 6, 'ellipsis-end'])
  })

  it('shows the last three pages and a leading ellipsis on the last page', () => {
    expect(getPageWindow(17, 17)).toEqual(['ellipsis-start', 15, 16, 17])
  })

  it('shows every page without ellipsis when there are three pages or fewer', () => {
    expect(getPageWindow(1, 2)).toEqual([1, 2])
    expect(getPageWindow(2, 3)).toEqual([1, 2, 3])
    expect(getPageWindow(1, 0)).toEqual([])
  })
})

describe('PageNumbers', () => {
  it('marks the current page and changes page on click', () => {
    const onChange = vi.fn()

    render(<PageNumbers currentPage={5} totalPages={17} onChange={onChange} />)

    expect(screen.getByRole('button', { name: '5' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '5' })).toHaveClass('active')
    expect(screen.queryByRole('button', { name: '1' })).toBeNull()
    expect(screen.getAllByText('…')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: '6' }))

    expect(onChange).toHaveBeenCalledWith(6)
  })
})
