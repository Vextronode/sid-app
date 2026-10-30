import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  acceptSignatureRequest: vi.fn(),
  addSignatureBlock: vi.fn(),
  getSignatureBlocks: vi.fn(),
  getSignatureRequests: vi.fn(),
  rejectSignatureRequest: vi.fn(),
  removeSignatureBlock: vi.fn(),
}))

vi.mock('../api/signatureApi', () => api)
vi.mock('@/shared/lib/dialog', () => ({ confirmDialog: vi.fn().mockResolvedValue(true) }))
vi.mock('@/shared/lib/toast', () => ({ notifySuccess: vi.fn() }))

import { SignatureRequestsCard } from './SignatureRequestsCard'

const renderCard = () =>
  render(
    <MemoryRouter>
      <SignatureRequestsCard />
    </MemoryRouter>,
  )

describe('SignatureRequestsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getSignatureRequests.mockResolvedValue([])
    api.getSignatureBlocks.mockResolvedValue([])
  })

  it('stays visible even without any request', async () => {
    renderCard()

    expect(screen.getByRole('heading', { name: /Permintaan Tanda Tangan & Saksi/ })).toBeTruthy()
    expect(await screen.findByText(/Tidak ada permintaan yang menunggu/)).toBeTruthy()
  })

  it('labels a witness request and accepts it with the password', async () => {
    api.getSignatureRequests.mockResolvedValue([
      {
        id: 7,
        signer_type: 'witness',
        slot_label: 'Saksi I',
        applicant_name: 'Tini Nurjanah',
        letter_type: 'Pelaporan Kematian',
      },
    ])
    api.acceptSignatureRequest.mockResolvedValue({})
    renderCard()

    expect(await screen.findByText('Tini Nurjanah meminta Anda menjadi Saksi I')).toBeTruthy()
    expect(screen.getByText('Saksi')).toBeTruthy()

    fireEvent.change(screen.getByLabelText(/Kata sandi Anda/), { target: { value: 'Rahasia1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Setujui' }))

    await waitFor(() => expect(api.acceptSignatureRequest).toHaveBeenCalledWith(7, 'Rahasia1'))
  })

  it('opens the block list and blocks a resident by NIK', async () => {
    api.getSignatureBlocks.mockResolvedValue([
      { id: 3, blocked_user_name: 'Pemohon Iseng', blocked_nik_masked: '************0009' },
    ])
    api.addSignatureBlock.mockResolvedValue({})
    renderCard()

    fireEvent.click(await screen.findByRole('button', { name: /Daftar blokir \(1\)/ }))
    expect(screen.getByText('Pemohon Iseng')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('NIK warga yang diblokir'), {
      target: { value: '3207010101800008' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Blokir' }))

    await waitFor(() => expect(api.addSignatureBlock).toHaveBeenCalledWith('3207010101800008'))
  })
})
