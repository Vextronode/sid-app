import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi, beforeEach } from 'vitest'

const { confirmDialog, notifySuccess } = vi.hoisted(() => ({
  confirmDialog: vi.fn(),
  notifySuccess: vi.fn(),
}))
vi.mock('@/shared/lib/dialog', () => ({ confirmDialog, alertDialog: vi.fn() }))
vi.mock('@/shared/lib/toast', () => ({ notifySuccess }))

import TampilanPublikCard from './TampilanPublikCard'

const profile = {
  logo_url: '/assets/image/lambang.webp',
  hero_image_url: null,
  office_hours: 'Senin – Jumat, 08.00 – 16.00 WIB',
  latitude: -7.6803137,
  longitude: 108.5513816,
  hero_photo_credit: '',
}

const renderCard = (props = {}) => {
  const onUpload = vi.fn().mockResolvedValue()
  const onEditText = vi.fn()
  render(
    <TampilanPublikCard profile={profile} onUpload={onUpload} onEditText={onEditText} {...props} />,
  )
  return { onUpload, onEditText }
}

const pick = (label, file) =>
  fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } })

beforeEach(() => {
  confirmDialog.mockResolvedValue(true)
})

describe('TampilanPublikCard', () => {
  beforeAll(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
  })

  it('shows the current public appearance from the village data', () => {
    const { onEditText } = renderCard()

    expect(screen.getByRole('img', { name: 'Logo / Lambang' })).toHaveAttribute(
      'src',
      '/assets/image/lambang.webp',
    )
    expect(screen.getByText('Senin – Jumat, 08.00 – 16.00 WIB')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /-7\.6803137, 108\.5513816/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=-7.6803137,108.5513816',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Edit Teks' }))
    expect(onEditText).toHaveBeenCalled()
  })

  it('uploads a new hero photo after previewing it', async () => {
    const { onUpload } = renderCard()
    const file = new File(['x'], 'hero.jpg', { type: 'image/jpeg' })

    pick('Pilih gambar', file)
    expect(screen.getByRole('img', { name: 'Pratinjau foto beranda' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))

    await waitFor(() => expect(onUpload).toHaveBeenCalledWith('hero', file))
    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith('Foto Beranda berhasil disimpan.'),
    )
  })

  it('rejects files that are too large or not images before uploading', () => {
    const { onUpload } = renderCard()

    pick('Ganti gambar', new File(['x'], 'logo.pdf', { type: 'application/pdf' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Format berkas harus PNG, JPG, atau WebP.')

    const big = new File(['x'], 'logo.png', { type: 'image/png' })
    Object.defineProperty(big, 'size', { value: 3 * 1024 * 1024 })
    pick('Ganti gambar', big)
    expect(screen.getByRole('alert')).toHaveTextContent('Ukuran berkas maksimal 2 MB.')
    expect(onUpload).not.toHaveBeenCalled()
  })

  it('shows the server message when the upload fails', async () => {
    const onUpload = vi.fn().mockRejectedValue({
      response: { data: { errors: { image: ['Ukuran gambar maksimal 2 MB.'] } } },
    })
    renderCard({ onUpload })

    pick('Ganti gambar', new File(['x'], 'logo.png', { type: 'image/png' }))
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ukuran gambar maksimal 2 MB.')
  })
})
