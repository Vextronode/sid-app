import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DynamicSuratForm } from './DynamicSuratForm'
import { getLetterTypeFormConfig } from '../utils/letterTypeConfig'
import { present } from '@/test/fixtures'

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Joni Saputra', role: 'warga' } }),
}))

const config = present(
  getLetterTypeFormConfig({
    id: 1,
    code: 'A01',
    name: 'Surat Keterangan Usaha',
    produces_letter: true,
    data_action: 'none',
    form_fields: [
      { name: 'email_usaha', label: 'Email Usaha', type: 'email', required: true },
      { name: 'telepon_usaha', label: 'Nomor HP Usaha', type: 'phone', required: true },
    ],
  }),
  'konfigurasi jenis surat',
)

describe('DynamicSuratForm email and phone fields', () => {
  it('renders the matching mobile-friendly inputs', () => {
    render(<DynamicSuratForm config={config} onSubmitAPI={vi.fn()} />)

    const email = screen.getByLabelText(/Email Usaha/)
    const phone = screen.getByLabelText(/Nomor HP Usaha/)

    expect(email).toHaveAttribute('type', 'email')
    expect(phone).toHaveAttribute('type', 'tel')
    expect(phone).toHaveAttribute('inputMode', 'tel')
  })

  it('blocks invalid contacts and sends valid ones in the payload', async () => {
    const onSubmitAPI = vi.fn().mockResolvedValue({})
    render(<DynamicSuratForm config={config} onSubmitAPI={onSubmitAPI} />)

    fireEvent.change(screen.getByLabelText(/Email Usaha/), { target: { value: 'bukan-email' } })
    fireEvent.change(screen.getByLabelText(/Nomor HP Usaha/), { target: { value: '0221234567' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kirim' }))

    expect(await screen.findByText('Email Usaha tidak valid')).toBeInTheDocument()
    expect(screen.getByText('Nomor HP Usaha harus nomor HP, mis. 081234567890')).toBeInTheDocument()
    expect(onSubmitAPI).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/Email Usaha/), {
      target: { value: 'warkop@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/Nomor HP Usaha/), {
      target: { value: '081234567890' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Kirim' }))

    await waitFor(() => expect(onSubmitAPI).toHaveBeenCalledTimes(1))
    const payload = onSubmitAPI.mock.calls[0][0] as FormData
    expect(payload.get('payload[email_usaha]')).toBe('warkop@example.com')
    expect(payload.get('payload[telepon_usaha]')).toBe('081234567890')
  })
})
