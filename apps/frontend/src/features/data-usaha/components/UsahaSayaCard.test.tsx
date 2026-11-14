import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CitizenBusiness } from '../api'

const api = vi.hoisted(() => ({
  getMyBusinesses: vi.fn(),
  requestCimartApplication: vi.fn(),
  cancelCimartApplication: vi.fn(),
}))
const dialog = vi.hoisted(() => ({ confirmDialog: vi.fn() }))

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-1', role: 'warga' } }),
}))
vi.mock('../api', () => api)
vi.mock('@/shared/lib/dialog', () => dialog)
vi.mock('@/shared/lib/toast', () => ({ notifySuccess: vi.fn() }))

import { UsahaSayaCard } from './UsahaSayaCard'

function business(overrides: Partial<CitizenBusiness> = {}): CitizenBusiness {
  return {
    id: 'b-1',
    business_name: 'Warung Kopi Joni',
    business_activity: 'Warung kopi',
    category: 'kuliner',
    category_label: 'Toko Kuliner',
    address: 'Jl. Raya Cibenda',
    email: 'joni@example.com',
    phone: '081234567890',
    letter: { id: 'l-1', letter_number: '500/001', expires_at: '2027-11-12T00:00:00Z' },
    letter_status: 'berlaku',
    cimart_status: null,
    cimart_status_label: 'Belum mendaftar',
    cimart_note: null,
    cimart_requested_at: null,
    cimart_decided_at: null,
    cimart_cancelled_at: null,
    can_request_cimart: true,
    can_cancel_cimart: false,
    created_at: null,
    ...overrides,
  }
}

function renderCard() {
  return render(
    <MemoryRouter>
      <UsahaSayaCard />
    </MemoryRouter>,
  )
}

describe('UsahaSayaCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dialog.confirmDialog.mockResolvedValue(true)
  })

  it('stays hidden when the account has no business', async () => {
    api.getMyBusinesses.mockResolvedValue([])

    const { container } = renderCard()

    await waitFor(() => expect(api.getMyBusinesses).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it.each([
    ['not registered', business(), 'Daftarkan ke Cimart', null],
    [
      'rejected',
      business({
        cimart_status: 'rejected',
        cimart_status_label: 'Ditolak',
        cimart_note: 'Foto tidak sesuai',
      }),
      'Daftar ulang',
      /Alasan penolakan: Foto tidak sesuai.*SKU baru/,
    ],
    [
      'cancelled',
      business({ cimart_status: 'cancelled', cimart_status_label: 'Pendaftaran dibatalkan' }),
      'Daftar ulang',
      null,
    ],
  ])('offers registration when %s', async (_, item, label, note) => {
    api.getMyBusinesses.mockResolvedValue([item])

    renderCard()

    expect(await screen.findByRole('button', { name: label })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Batalkan pendaftaran' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Lihat SKU' })).toHaveAttribute(
      'href',
      '/surat-saya/daftar?surat=l-1',
    )
    if (note) expect(screen.getByText(note)).toBeInTheDocument()
  })

  it('offers only cancellation while pending', async () => {
    api.getMyBusinesses.mockResolvedValue([
      business({
        cimart_status: 'pending',
        cimart_status_label: 'Menunggu diproses Cimart',
        can_request_cimart: false,
        can_cancel_cimart: true,
      }),
    ])

    renderCard()

    expect(await screen.findByRole('button', { name: 'Batalkan pendaftaran' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Daftar/ })).not.toBeInTheDocument()
    expect(screen.getByText('Menunggu diproses Cimart')).toBeInTheDocument()
  })

  it('offers no buttons once the merchant account exists, and explains how to delete it', async () => {
    api.getMyBusinesses.mockResolvedValue([
      business({
        cimart_status: 'accepted',
        cimart_status_label: 'Akun pedagang sudah dibuat',
        can_request_cimart: false,
      }),
    ])

    renderCard()

    expect(await screen.findByText(/hubungi Cimart/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('tells the citizen to submit a new SKU once it has expired', async () => {
    api.getMyBusinesses.mockResolvedValue([
      business({ letter_status: 'kedaluwarsa', can_request_cimart: false }),
    ])

    renderCard()

    expect(await screen.findByText(/Ajukan SKU baru untuk mendaftar/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('registers after confirmation and shows the new status', async () => {
    api.getMyBusinesses.mockResolvedValue([business()])
    api.requestCimartApplication.mockResolvedValue({
      message: 'ok',
      data: business({
        cimart_status: 'pending',
        cimart_status_label: 'Menunggu diproses Cimart',
        can_request_cimart: false,
        can_cancel_cimart: true,
      }),
    })

    renderCard()
    fireEvent.click(await screen.findByRole('button', { name: 'Daftarkan ke Cimart' }))

    await waitFor(() => expect(api.requestCimartApplication).toHaveBeenCalledWith('b-1'))
    expect(dialog.confirmDialog.mock.calls[0][0].message).toMatch(/NIK/)
    expect(await screen.findByRole('button', { name: 'Batalkan pendaftaran' })).toBeInTheDocument()
  })

  it('does nothing when the cancellation is not confirmed', async () => {
    dialog.confirmDialog.mockResolvedValue(false)
    api.getMyBusinesses.mockResolvedValue([
      business({ cimart_status: 'pending', can_request_cimart: false, can_cancel_cimart: true }),
    ])

    renderCard()
    fireEvent.click(await screen.findByRole('button', { name: 'Batalkan pendaftaran' }))

    await waitFor(() => expect(dialog.confirmDialog).toHaveBeenCalled())
    expect(api.cancelCimartApplication).not.toHaveBeenCalled()
  })
})
