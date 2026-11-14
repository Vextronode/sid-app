import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Switch } from './Switch'

function ControlledSwitch({ initial = false, disabled = false }) {
  const [checked, setChecked] = useState(initial)

  return <Switch checked={checked} onCheckedChange={setChecked} label="H-7" disabled={disabled} />
}

describe('Switch', () => {
  it('exposes switch semantics and toggles on click', async () => {
    const user = userEvent.setup()
    render(<ControlledSwitch />)

    const toggle = screen.getByRole('switch', { name: 'H-7' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-checked', 'true')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  it('toggles with Space and Enter, and sets state with arrow keys', async () => {
    const user = userEvent.setup()
    render(<ControlledSwitch />)

    const toggle = screen.getByRole('switch', { name: 'H-7' })
    await user.tab()
    expect(toggle).toHaveFocus()

    await user.keyboard(' ')
    expect(toggle).toHaveAttribute('aria-checked', 'true')

    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-checked', 'false')

    await user.keyboard('{ArrowRight}')
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    await user.keyboard('{ArrowRight}')
    expect(toggle).toHaveAttribute('aria-checked', 'true')

    await user.keyboard('{ArrowLeft}')
    expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  it('does nothing while disabled', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(<Switch checked onCheckedChange={onCheckedChange} label="H-7" disabled />)

    const toggle = screen.getByRole('switch', { name: 'H-7' })
    expect(toggle).toBeDisabled()

    await user.click(toggle)
    expect(onCheckedChange).not.toHaveBeenCalled()
  })
})
