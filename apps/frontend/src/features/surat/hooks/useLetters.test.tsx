import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('@/lib/api', () => ({ default: api }))

import { useLetters } from './useLetters'

function wrapper({ children }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useLetters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockResolvedValue({
      data: {
        data: [{ id: 'letter-11' }],
        meta: { current_page: 2, per_page: 10, total: 11, last_page: 2 },
      },
    })
  })

  it('requests the callers own letters one page at a time', async () => {
    const { result } = renderHook(() => useLetters({ page: 2, status: 'approved' }), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(api.get).toHaveBeenCalledWith('/api/letters', {
      params: { scope: 'mine', page: 2, per_page: 10, status: 'approved' },
    })
    expect(result.current.letters).toEqual([{ id: 'letter-11' }])
    expect(result.current.meta.last_page).toBe(2)
  })

  it('forwards an exact submission time range', async () => {
    const range = {
      submittedFrom: '2026-10-09T17:00:00.000Z',
      submittedTo: '2026-10-10T16:59:59.999Z',
    }

    const { result } = renderHook(() => useLetters({ page: 3, perPage: 1, ...range }), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(api.get).toHaveBeenCalledWith('/api/letters', {
      params: {
        scope: 'mine',
        page: 3,
        per_page: 1,
        submitted_from: range.submittedFrom,
        submitted_to: range.submittedTo,
      },
    })
  })

  it('defaults to the first page without a status filter', async () => {
    const { result } = renderHook(() => useLetters(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(api.get).toHaveBeenCalledWith('/api/letters', {
      params: { scope: 'mine', page: 1, per_page: 10 },
    })
  })
})
