import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './shared/lib/queryClient'
import './index.css'
import '@/styles/sid-global.css'
import App from './App.jsx'
import { DialogHost } from '@/components/ui/DialogHost'
import { ToastHost } from '@/components/ui/ToastHost'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <DialogHost />
      <ToastHost />
    </QueryClientProvider>
  </StrictMode>,
)
