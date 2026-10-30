import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RefreshButton } from './RefreshButton'

describe('RefreshButton', () => {
  it('disables itself while the refresh is running and re-enables afterwards', async () => {
    let finish: (value?: unknown) => void
    const onRefresh = vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const user = userEvent.setup()

    render(<RefreshButton onRefresh={onRefresh} />)
    const button = screen.getByRole('button', { name: 'Refresh' })

    await user.click(button)
    expect(onRefresh).toHaveBeenCalledOnce()
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')

    finish()
    await vi.waitFor(() => expect(button).toBeEnabled())
    expect(button).not.toHaveAttribute('aria-busy')
  })

  it('stays disabled while an external fetch is in progress', () => {
    render(<RefreshButton onRefresh={vi.fn()} refreshing />)

    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled()
  })

  it('respects the disabled prop', () => {
    render(<RefreshButton onRefresh={vi.fn()} disabled />)

    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled()
  })
})
