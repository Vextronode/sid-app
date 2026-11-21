import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

import { useLiveRefetchInterval } from '@/features/realtime/hooks/useLiveRefetchInterval'
import { queryKeys } from '@/shared/lib/queryKeys'
import {
  SURAT_REFRESH_INTERVAL,
  useSuratListQuery,
  useSuratSummaryQuery,
} from './useSuratListQuery'

const api = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('@/lib/api', () => ({ default: api }))

// Bawaan: realtime tidak hidup, interval polling tetap 30 detik.
vi.mock('@/features/realtime/hooks/useLiveRefetchInterval', () => ({
  useLiveRefetchInterval: vi.fn((_scope: string, fallbackMs: number) => fallbackMs),
}))

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

  return { client, wrapper }
}

describe('useSuratListQuery realtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useLiveRefetchInterval).mockImplementation((_scope, fallbackMs) => fallbackMs)
    api.get.mockResolvedValue({ data: { data: [], meta: undefined } })
  })

  it('polls the letter list every 30 seconds while realtime is not live', async () => {
    const { client, wrapper } = setup()

    const { result } = renderHook(() => useSuratListQuery({ page: 1 }), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const list = client.getQueryCache().find({ queryKey: queryKeys.surat.list({ page: 1 }) })
    expect(useLiveRefetchInterval).toHaveBeenCalledWith('letters', SURAT_REFRESH_INTERVAL)
    expect(list?.observers[0]?.options.refetchInterval).toBe(SURAT_REFRESH_INTERVAL)
  })

  it('relaxes polling for list and summary while realtime is live, and refetches them after reconnect', async () => {
    vi.mocked(useLiveRefetchInterval).mockReturnValue(5 * 60 * 1000)
    const { client, wrapper } = setup()

    const list = renderHook(() => useSuratListQuery(), { wrapper })
    const summary = renderHook(() => useSuratSummaryQuery(), { wrapper })
    await waitFor(() => expect(list.result.current.loading).toBe(false))
    await waitFor(() => expect(summary.result.current.loading).toBe(false))

    const cache = client.getQueryCache()
    for (const queryKey of [queryKeys.surat.list({}), queryKeys.surat.summary({})]) {
      const query = cache.find({ queryKey })
      expect(query?.observers[0]?.options.refetchInterval).toBe(5 * 60 * 1000)
      expect(query?.meta).toEqual({ realtime: true })
    }
  })
})
