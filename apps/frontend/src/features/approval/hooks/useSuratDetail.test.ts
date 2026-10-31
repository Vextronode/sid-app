import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getSuratDetail } from '@/lib/api'

import { useSuratDetail } from './useSuratDetail'

vi.mock('@/lib/api', () => ({ getSuratDetail: vi.fn() }))

const mockedGetSuratDetail = vi.mocked(getSuratDetail, { partial: true, deep: true })

describe('useSuratDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('loads the letter and reloads it on refresh', async () => {
    mockedGetSuratDetail.mockResolvedValueOnce({
      data: { data: { id: 'letter-7', status: 'pending' } },
    })
    const { result } = renderHook(() => useSuratDetail('letter-7'))

    await waitFor(() => expect(result.current.surat?.status).toBe('pending'))

    mockedGetSuratDetail.mockResolvedValueOnce({
      data: { data: { id: 'letter-7', status: 'in_progress' } },
    })
    await act(() => result.current.refresh())

    expect(result.current.surat?.status).toBe('in_progress')
    expect(mockedGetSuratDetail).toHaveBeenCalledTimes(2)
  })

  it('marks a missing letter as not found', async () => {
    mockedGetSuratDetail.mockRejectedValueOnce({ response: { status: 404 } })
    const { result } = renderHook(() => useSuratDetail('letter-9'))

    await waitFor(() => expect(result.current.notFound).toBe(true))
    expect(result.current.surat).toBeNull()
  })

  it('does not request anything without an id', () => {
    const { result } = renderHook(() => useSuratDetail(null))

    expect(mockedGetSuratDetail).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })
})
