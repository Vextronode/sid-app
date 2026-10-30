import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './shared/lib/queryClient'
import './index.css'
import '@/styles/sid-global.css'
import App from './App'
import { DialogHost } from '@/components/ui/DialogHost'
import { ToastHost } from '@/components/ui/ToastHost'

const root = document.getElementById('root')

if (!root) throw new Error('Elemen #root tidak ditemukan di index.html.')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <DialogHost />
      <ToastHost />
    </QueryClientProvider>
  </StrictMode>,
)
