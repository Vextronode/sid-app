import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IntegrationClient } from '@/features/integrasi/api'

const api = vi.hoisted(() => ({
  getIntegrationClients: vi.fn(),
  updateIntegrationClientStatus: vi.fn(),
  issueIntegrationToken: vi.fn(),
  revokeIntegrationToken: vi.fn(),
}))
const dialog = vi.hoisted(() => ({ confirmDialog: vi.fn() }))
const copy = vi.hoisted(() => ({ copyText: vi.fn() }))

vi.mock('@/features/integrasi/api', () => api)
vi.mock('@/shared/lib/dialog', () => dialog)
vi.mock('@/shared/lib/copyText', () => copy)
vi.mock('@/shared/lib/toast', () => ({ notifySuccess: vi.fn() }))
vi.mock('@/components/layout/SiteFooter', () => ({ SiteFooter: (): null => null }))

import IntegrasiPage from './IntegrasiPage'

const oldToken = {
  id: 't-old',
  name: 'cimart-20261112-080000',
  created_at: '2026-11-12T01:00:00Z',
  last_used_at: '2026-11-17T01:00:00Z',
}
const newToken = {
  id: 't-new',
  name: 'cimart-20261117-090000',
  created_at: '2026-11-17T02:00:00Z',
  last_used_at: null,
}

function cimart(overrides: Partial<IntegrationClient> = {}): IntegrationClient {
  return {
    id: 'c-1',
    slug: 'cimart',
    name: 'Cimart',
    is_active: true,
    abilities: [
      { value: 'seller-applications:read', label: 'Membaca permohonan pedagang' },
      { value: 'seller-applications:update', label: 'Melaporkan hasil permohonan pedagang' },
    ],
    last_used_at: oldToken.last_used_at,
    tokens: [oldToken],
    ...overrides,
  }
}

async function renderPage() {
  render(<IntegrasiPage />)

  await screen.findByRole('heading', { name: 'Token Cimart' })
}

function passwordDialog() {
  return screen.getByRole('dialog')
}

function submitPassword(password: string, confirmLabel: string) {
  const modal = passwordDialog()
  fireEvent.change(within(modal).getByLabelText('Kata sandi Anda'), {
    target: { value: password },
  })
  fireEvent.click(within(modal).getByRole('button', { name: confirmLabel }))
}

describe('IntegrasiPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getIntegrationClients.mockResolvedValue([cimart()])
    dialog.confirmDialog.mockResolvedValue(true)
    copy.copyText.mockResolvedValue(true)
  })

  it('lists the client with status, abilities, and its tokens', async () => {
    await renderPage()

    const row = screen.getByRole('row', { name: /Cimart/ })
    expect(within(row).getByText('Aktif')).toBeInTheDocument()
    expect(within(row).getByText('Membaca permohonan pedagang')).toBeInTheDocument()
    expect(screen.getByText('cimart-20261112-080000')).toBeInTheDocument()
    expect(screen.getByText('Terbaru')).toBeInTheDocument()
  })

  it('issues a new token after password confirmation and shows it only once', async () => {
    api.issueIntegrationToken.mockResolvedValue({
      data: cimart({ tokens: [newToken, oldToken] }),
      message: 'Token baru diterbitkan.',
      token: 'abc|rahasia-token-baru',
    })

    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Terbitkan token baru' }))

    // Kata sandi salah: pesan backend tampil di modal, token tidak muncul.
    api.issueIntegrationToken.mockRejectedValueOnce({
      response: { status: 422, data: { errors: { password: ['Kata sandi tidak sesuai.'] } } },
    })
    submitPassword('salah', 'Terbitkan token')
    expect(await screen.findByText('Kata sandi tidak sesuai.')).toBeInTheDocument()

    submitPassword('Password123', 'Terbitkan token')

    const tokenInput = await screen.findByDisplayValue('abc|rahasia-token-baru')
    expect(api.issueIntegrationToken).toHaveBeenLastCalledWith('c-1', 'Password123')
    expect(screen.getByText(/tidak bisa dilihat lagi/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Salin token' }))
    await waitFor(() => expect(copy.copyText).toHaveBeenCalledWith('abc|rahasia-token-baru'))
    expect(await screen.findByRole('button', { name: 'Tersalin' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Selesai' }))
    expect(tokenInput).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('abc|rahasia-token-baru')).toBeNull()

    // Token lama tetap tercantum dan ditandai, beserta pemakaian terakhirnya.
    expect(screen.getByText('Token lama')).toBeInTheDocument()
    expect(screen.getByText('cimart-20261117-090000')).toBeInTheDocument()
  })

  it('revokes a token after password confirmation with a warning', async () => {
    api.revokeIntegrationToken.mockResolvedValue({
      data: cimart({ tokens: [] }),
      message: 'Token dicabut.',
    })

    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Cabut' }))

    expect(within(passwordDialog()).getByText(/langsung ditolak/)).toBeInTheDocument()
    submitPassword('Password123', 'Cabut token')

    await waitFor(() =>
      expect(api.revokeIntegrationToken).toHaveBeenCalledWith('c-1', 't-old', 'Password123'),
    )
    expect(await screen.findByText(/Tidak ada token aktif/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('disables without a password but asks for one to enable', async () => {
    api.updateIntegrationClientStatus
      .mockResolvedValueOnce({ data: cimart({ is_active: false }), message: 'Dinonaktifkan.' })
      .mockResolvedValueOnce({ data: cimart(), message: 'Diaktifkan.' })

    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Nonaktifkan' }))

    await waitFor(() =>
      expect(api.updateIntegrationClientStatus).toHaveBeenCalledWith('c-1', false),
    )
    expect(dialog.confirmDialog).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Nonaktifkan Cimart?' }),
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Aktifkan' }))
    submitPassword('Password123', 'Aktifkan')

    await waitFor(() =>
      expect(api.updateIntegrationClientStatus).toHaveBeenLastCalledWith(
        'c-1',
        true,
        'Password123',
      ),
    )
    expect(await screen.findByRole('button', { name: 'Nonaktifkan' })).toBeInTheDocument()
  })

  it('does not disable when the warning is cancelled', async () => {
    dialog.confirmDialog.mockResolvedValue(false)

    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Nonaktifkan' }))

    await waitFor(() => expect(dialog.confirmDialog).toHaveBeenCalled())
    expect(api.updateIntegrationClientStatus).not.toHaveBeenCalled()
  })
})
