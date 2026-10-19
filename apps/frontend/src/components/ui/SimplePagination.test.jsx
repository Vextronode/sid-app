import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SimplePagination } from './SimplePagination'

describe('SimplePagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(<SimplePagination page={1} totalPages={1} onChange={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('keeps the page size choice visible on a single page', async () => {
    const onPageSizeChange = vi.fn()

    render(
      <SimplePagination
        page={1}
        totalPages={1}
        onChange={vi.fn()}
        pageSize={10}
        onPageSizeChange={onPageSizeChange}
      />,
    )

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Baris per halaman' }), '25')

    expect(onPageSizeChange).toHaveBeenCalledWith(25)
  })

  it('disables the previous button on the first page and moves forward', async () => {
    const onChange = vi.fn()

    render(<SimplePagination page={1} totalPages={3} onChange={onChange} />)

    expect(screen.getByText('Halaman 1 dari 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sebelumnya' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page')

    await userEvent.click(screen.getByRole('button', { name: '3' }))

    expect(onChange).toHaveBeenCalledWith(3)

    await userEvent.click(screen.getByRole('button', { name: 'Berikutnya' }))

    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('disables the next button on the last page and moves back', async () => {
    const onChange = vi.fn()

    render(<SimplePagination page={3} totalPages={3} onChange={onChange} />)

    expect(screen.getByRole('button', { name: 'Berikutnya' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Sebelumnya' }))

    expect(onChange).toHaveBeenCalledWith(2)
  })
})
