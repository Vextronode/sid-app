import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useQueryRefresh } from './useQueryRefresh'
import type { ReactNode } from 'react'

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const fetchSurat = vi.fn(async () => 'surat')
  const fetchDashboard = vi.fn(async () => 'dashboard')
  const fetchOther = vi.fn(async () => 'other')

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

  const { result } = renderHook(
    () => {
      useQuery({ queryKey: ['surat', 'list', { page: 1 }], queryFn: fetchSurat })
      useQuery({ queryKey: ['dashboard', 'gender-stats'], queryFn: fetchDashboard })
      useQuery({ queryKey: ['notifications', 'list'], queryFn: fetchOther })

      return useQueryRefresh(['surat'], ['dashboard'])
    },
    { wrapper },
  )

  return { result, fetchSurat, fetchDashboard, fetchOther }
}

describe('useQueryRefresh', () => {
  it('refetches only the active queries under the given key prefixes', async () => {
    const { result, fetchSurat, fetchDashboard, fetchOther } = setup()

    await waitFor(() => expect(result.current.refreshing).toBe(false))
    expect(fetchSurat).toHaveBeenCalledTimes(1)

    await act(() => result.current.refresh())

    expect(fetchSurat).toHaveBeenCalledTimes(2)
    expect(fetchDashboard).toHaveBeenCalledTimes(2)
    expect(fetchOther).toHaveBeenCalledTimes(1)
  })
})
