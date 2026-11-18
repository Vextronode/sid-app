import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getWebPushSubscribers } = vi.hoisted(() => ({ getWebPushSubscribers: vi.fn() }))

vi.mock('@/features/pelanggan-notifikasi/api', () => ({ getWebPushSubscribers }))
vi.mock('@/features/kelola-wilayah/api', () => ({
  getHamlets: vi.fn().mockResolvedValue({ data: { data: [] } }),
  getRws: vi.fn().mockResolvedValue({ data: { data: [] } }),
  getRts: vi.fn().mockResolvedValue({ data: { data: [] } }),
}))
vi.mock('@/components/layout/SiteFooter', () => ({ SiteFooter: (): null => null }))

import PelangganNotifikasiPage from './PelangganNotifikasiPage'

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PelangganNotifikasiPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const response = {
  data: [
    {
      id: 'u1',
      name: 'Budi Santoso',
      username: 'budi',
      role: 'warga',
      role_label: 'Warga',
      is_active: true,
      nik_masked: '************0123',
      wilayah: { hamlet: 'Krajan', rw: '002', rt: '001' },
      device_count: 2,
      status: 'aktif',
      first_subscribed_at: '2026-10-01T03:00:00Z',
      last_success_at: '2026-11-17T03:00:00Z',
      devices: [
        {
          id: 1,
          device_label: 'Chrome · Android',
          push_service: 'fcm',
          status: 'aktif',
          subscribed_at: '2026-10-01T03:00:00Z',
          updated_at: '2026-10-01T03:00:00Z',
          last_success_at: '2026-11-17T03:00:00Z',
          last_failed_at: null,
        },
        {
          id: 2,
          device_label: null,
          push_service: 'apple',
          status: 'belum_teruji',
          subscribed_at: '2026-11-01T03:00:00Z',
          updated_at: '2026-11-01T03:00:00Z',
          last_success_at: null,
          last_failed_at: null,
        },
      ],
    },
  ],
  meta: {
    current_page: 1,
    per_page: 20,
    total: 1,
    last_page: 1,
    active_days: 30,
    summary: {
      subscribed_accounts: 1,
      devices: 2,
      active_accounts: 4,
      devices_by_status: { aktif: 1, perlu_dicek: 0, belum_teruji: 1 },
    },
  },
}

describe('PelangganNotifikasiPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getWebPushSubscribers.mockResolvedValue(response)
  })

  it('shows the summary and subscribed accounts', async () => {
    renderPage()

    expect(await screen.findByText('Budi Santoso')).toBeInTheDocument()
    expect(screen.getByText('@budi · ************0123')).toBeInTheDocument()
    expect(screen.getByText('RT 001 / RW 002 · Krajan')).toBeInTheDocument()
    expect(screen.getByText('25% dari 4 akun aktif')).toBeInTheDocument()
    expect(screen.getByText('0 perlu dicek · 1 belum teruji')).toBeInTheDocument()
  })

  it('expands the device list of an account', async () => {
    renderPage()

    const toggle = await screen.findByRole('button', { name: /2 perangkat/ })
    expect(screen.queryByText('Chrome · Android')).not.toBeInTheDocument()

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    // Label layanan juga ada di pilihan filter, jadi dicari di baris perangkat.
    const devices = within(document.getElementById('push-devices-u1') as HTMLElement)
    expect(devices.getByText('Chrome · Android')).toBeInTheDocument()
    expect(devices.getByText('Tidak diketahui')).toBeInTheDocument()
    expect(devices.getByText('Apple (Safari/iOS)')).toBeInTheDocument()
  })

  it('sends selected filters to the API', async () => {
    renderPage()
    await screen.findByText('Budi Santoso')

    fireEvent.change(screen.getByLabelText('Filter peran'), { target: { value: 'rt' } })
    fireEvent.change(screen.getByLabelText('Filter status'), { target: { value: 'perlu_dicek' } })

    await waitFor(() =>
      expect(getWebPushSubscribers).toHaveBeenLastCalledWith(
        expect.objectContaining({ role: 'rt', status: 'perlu_dicek', page: 1 }),
      ),
    )
  })

  it('shows an error message when loading fails', async () => {
    getWebPushSubscribers.mockRejectedValue(new Error('boom'))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Gagal memuat pelanggan notifikasi.')
  })
})
