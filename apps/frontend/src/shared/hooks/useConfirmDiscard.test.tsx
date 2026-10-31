import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { confirmDialog } = vi.hoisted(() => ({ confirmDialog: vi.fn() }))
vi.mock('@/shared/lib/dialog', () => ({ confirmDialog, currentDialog: (): null => null }))

import { useConfirmDiscard } from './useConfirmDiscard'

describe('useConfirmDiscard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('closes right away when the form is unchanged', async () => {
    const close = vi.fn()
    const { result } = renderHook(() => useConfirmDiscard(false))

    await result.current(close)

    expect(confirmDialog).not.toHaveBeenCalled()
    expect(close).toHaveBeenCalledOnce()
  })

  it('asks before discarding changes and keeps the form open on cancel', async () => {
    confirmDialog.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    const close = vi.fn()
    const { result } = renderHook(() => useConfirmDiscard(true))

    await result.current(close)
    expect(confirmDialog).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Buang perubahan?', confirmLabel: 'Buang perubahan' }),
    )
    expect(close).not.toHaveBeenCalled()

    await result.current(close)
    expect(close).toHaveBeenCalledOnce()
  })

  it('does nothing while saving', async () => {
    const close = vi.fn()
    const { result } = renderHook(() => useConfirmDiscard(true, { disabled: true }))

    await result.current(close)

    expect(confirmDialog).not.toHaveBeenCalled()
    expect(close).not.toHaveBeenCalled()
  })
})
