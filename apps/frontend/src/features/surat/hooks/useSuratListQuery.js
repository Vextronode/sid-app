import { useQuery } from '@tanstack/react-query'

import api from '@/lib/api'
import { queryKeys } from '@/shared/lib/queryKeys'

const EMPTY_LETTERS = []

export const SURAT_REFRESH_INTERVAL = 30 * 1000

// Satu sumber daftar surat untuk dashboard, grafik, dan halaman daftar:
// komponen yang tampil bersamaan berbagi satu request, penyegaran berkala
// berhenti saat tab tidak aktif, dan data langsung tersedia saat pindah
// halaman. Scope data tetap ditentukan backend dari sesi pengguna.
export function useSuratListQuery(params = null) {
  const { data, isPending, refetch } = useQuery({
    queryKey: queryKeys.surat.list(params),
    queryFn: async () => {
      const response = await api.get('/api/letters', params ? { params } : undefined)

      return Array.isArray(response.data?.data) ? response.data.data : []
    },
    // Selalu segarkan saat halaman dibuka (mis. setelah mengajukan surat);
    // cache tetap dipakai agar tampilan tidak kosong selama menunggu.
    staleTime: 0,
    refetchInterval: SURAT_REFRESH_INTERVAL,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })

  return {
    letters: data ?? EMPTY_LETTERS,
    loading: isPending,
    refresh: refetch,
  }
}
