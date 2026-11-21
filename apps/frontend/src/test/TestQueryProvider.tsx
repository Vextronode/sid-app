import { useState } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// QueryClient baru untuk tiap render: cache tidak terbawa antar-test, dan
// galat request langsung terlihat (tanpa retry seperti di aplikasi).
export function TestQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
