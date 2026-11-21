import { useCallback, useEffect, useState } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'

import { REALTIME_QUERY_META } from '@/features/realtime/constants'
import { useLiveRefetchInterval } from '@/features/realtime/hooks/useLiveRefetchInterval'
import api from '@/lib/api'
import { queryKeys } from '@/shared/lib/queryKeys'
import type { LetterListItem, LetterSummary, PageMeta, PaginatedResponse } from '@/types'

// Parameter query daftar/ringkasan surat; nilai kosong tidak dikirim.
export type SuratQueryParams = Record<string, string | number | null | undefined>

const EMPTY_LETTERS: LetterListItem[] = []
const EMPTY_META: PageMeta = { current_page: 1, per_page: 20, total: 0, last_page: 1 }

export const SURAT_REFRESH_INTERVAL = 30 * 1000

// Realtime: sinyal `letter.changed` (RealtimeBridge) membuat daftar dan
// ringkasan diambil ulang segera. Saat WebSocket mati atau putus, polling
// tiap 30 detik. Penyegaran berkala berhenti saat tab tidak aktif dan
// langsung berjalan lagi saat tab kembali dibuka.
function useLiveQueryOptions() {
  return {
    staleTime: 0,
    refetchInterval: useLiveRefetchInterval('letters', SURAT_REFRESH_INTERVAL),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    meta: REALTIME_QUERY_META,
  }
}

function cleanParams(params?: SuratQueryParams) {
  return Object.fromEntries(
    Object.entries(params ?? {}).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  )
}

// Daftar surat berpaginasi di server. Scope data ditentukan backend dari
// sesi pengguna; filter, pencarian, dan halaman dikirim sebagai parameter
// (page, per_page, status, search, letter_type_id, scope, from, to).
export function useSuratListQuery(params?: SuratQueryParams) {
  const query = cleanParams(params)
  const queryClient = useQueryClient()
  const liveOptions = useLiveQueryOptions()

  // Setelah aksi (setujui, tolak, hapus, ajukan) daftar dan ringkasan
  // dashboard harus sama-sama segar.
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.surat.all }),
    [queryClient],
  )

  const { data, isPending, isFetching } = useQuery({
    queryKey: queryKeys.surat.list(query),
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<LetterListItem>>('/api/letters', {
        params: query,
      })

      return {
        letters: Array.isArray(response.data?.data) ? response.data.data : EMPTY_LETTERS,
        meta: response.data?.meta ?? EMPTY_META,
      }
    },
    placeholderData: keepPreviousData,
    ...liveOptions,
  })

  return {
    letters: data?.letters ?? EMPTY_LETTERS,
    meta: data?.meta ?? EMPTY_META,
    loading: isPending,
    isFetching,
    refresh,
  }
}

const EMPTY_PERIOD = { total: 0, pending: 0, in_progress: 0, approved: 0, rejected: 0 }

const EMPTY_SUMMARY: LetterSummary = {
  total: 0,
  by_status: { pending: 0, in_progress: 0, approved: 0, rejected: 0 },
  overdue: 0,
  by_type: [],
  by_period: { day: EMPTY_PERIOD, week: EMPTY_PERIOD, month: EMPTY_PERIOD },
}

// Angka ringkasan dashboard, dihitung backend atas scope yang sama dengan
// daftar surat sehingga tidak perlu mengunduh seluruh baris.
export function useSuratSummaryQuery(params?: SuratQueryParams) {
  const query = cleanParams(params)
  const liveOptions = useLiveQueryOptions()

  const { data, isPending } = useQuery({
    queryKey: queryKeys.surat.summary(query),
    queryFn: async () => {
      const response = await api.get<{ data?: LetterSummary }>('/api/letters/summary', {
        params: query,
      })

      return response.data?.data ?? EMPTY_SUMMARY
    },
    ...liveOptions,
  })

  return {
    summary: data ?? EMPTY_SUMMARY,
    loading: isPending,
  }
}

// Menunda nilai pencarian supaya tidak ada request untuk tiap ketikan.
export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
