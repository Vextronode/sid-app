import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ImportProgressOverlay } from './ImportProgressOverlay'

describe('ImportProgressOverlay', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('blocks the page, counts elapsed time, and warns before leaving', () => {
    const { unmount } = render(
      <ImportProgressOverlay title="Mengimpor data warga..." description="Mohon tunggu." />,
    )

    const panel = screen.getByRole('alertdialog', { name: 'Mengimpor data warga...' })
    expect(panel.getAttribute('aria-busy')).toBe('true')
    expect(document.activeElement).toBe(panel)

    act(() => vi.advanceTimersByTime(65_000))
    expect(screen.getByText('1:05')).toBeTruthy()

    const leave = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(leave)
    expect(leave.defaultPrevented).toBe(true)

    unmount()
    const afterUnmount = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(afterUnmount)
    expect(afterUnmount.defaultPrevented).toBe(false)
  })
})
