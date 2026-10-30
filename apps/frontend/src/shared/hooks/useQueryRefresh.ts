import { useCallback } from 'react'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'

const startsWith = (queryKey, prefix) => prefix.every((part, index) => queryKey[index] === part)

// Untuk RefreshButton di halaman berbasis React Query: mengambil ulang
// query yang sedang tampil dengan awalan key tertentu (mis. ['surat']),
// dan `refreshing` true selama salah satunya sedang dimuat, termasuk
// penyegaran berkala.
export function useQueryRefresh(...prefixes) {
  const queryClient = useQueryClient()
  const key = JSON.stringify(prefixes)

  const predicate = useCallback(
    (query) => JSON.parse(key).some((prefix) => startsWith(query.queryKey, prefix)),
    [key],
  )

  const refreshing = useIsFetching({ predicate }) > 0

  const refresh = useCallback(
    () => queryClient.refetchQueries({ predicate, type: 'active' }),
    [queryClient, predicate],
  )

  return { refresh, refreshing }
}
