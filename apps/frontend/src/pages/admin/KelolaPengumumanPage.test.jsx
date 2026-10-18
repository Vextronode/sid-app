import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getAnnouncement: vi.fn(),
  saveAnnouncement: vi.fn(),
  deleteAnnouncement: vi.fn(),
}))

vi.mock('@/features/pengumuman/api', () => api)
vi.mock('@/features/info-desa/usePublicVillageInfo', () => ({
  refreshPublicVillageInfo: vi.fn(),
}))
vi.mock('@/components/layout/SiteFooter', () => ({ SiteFooter: () => null }))

import KelolaPengumumanPage from './KelolaPengumumanPage'

const ACTIVE = {
  title: 'Kantor desa tutup Jumat siang',
  body: 'Pelayanan dibuka lagi Senin.',
  link_url: null,
  expires_at: new Date(Date.now() + 5 * 3_600_000).toISOString(),
  updated_at: '2026-10-20T09:00:00+07:00',
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <KelolaPengumumanPage />
    </MemoryRouter>,
  )

describe('KelolaPengumumanPage', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset())
  })

  it('creates an announcement with a preset duration', async () => {
    const user = userEvent.setup()
    api.getAnnouncement.mockResolvedValue({ data: { data: null } })
    api.saveAnnouncement.mockResolvedValue({ data: { data: ACTIVE } })
    renderPage()

    expect(await screen.findByText(/Belum ada pengumuman/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Judul'), 'Kantor desa tutup Jumat siang')
    await user.click(screen.getByRole('button', { name: '12 jam' }))
    await user.click(screen.getByRole('button', { name: 'Tayangkan pengumuman' }))

    expect(api.saveAnnouncement).toHaveBeenCalledWith({
      title: 'Kantor desa tutup Jumat siang',
      body: null,
      link_url: null,
      duration_value: 12,
      duration_unit: 'hour',
    })
    expect(await screen.findByText('Sedang tayang')).toBeInTheDocument()
  })

  it('requires a duration before publishing', async () => {
    const user = userEvent.setup()
    api.getAnnouncement.mockResolvedValue({ data: { data: null } })
    renderPage()

    await user.type(await screen.findByLabelText('Judul'), 'Tanpa durasi')
    await user.click(screen.getByRole('button', { name: 'Tayangkan pengumuman' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Pilih berapa lama pengumuman tampil.')
    expect(api.saveAnnouncement).not.toHaveBeenCalled()
  })

  it('accepts a custom duration', async () => {
    const user = userEvent.setup()
    api.getAnnouncement.mockResolvedValue({ data: { data: null } })
    api.saveAnnouncement.mockResolvedValue({ data: { data: ACTIVE } })
    renderPage()

    await user.type(await screen.findByLabelText('Judul'), 'Kerja bakti')
    await user.click(screen.getByRole('button', { name: 'Lainnya…' }))
    await user.clear(screen.getByLabelText('Jumlah'))
    await user.type(screen.getByLabelText('Jumlah'), '3')
    await user.selectOptions(screen.getByLabelText('Satuan'), 'day')
    await user.click(screen.getByRole('button', { name: 'Tayangkan pengumuman' }))

    expect(api.saveAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({ duration_value: 3, duration_unit: 'day' }),
    )
  })

  it('edits the active announcement and keeps its end time by default', async () => {
    const user = userEvent.setup()
    api.getAnnouncement.mockResolvedValue({ data: { data: ACTIVE } })
    api.saveAnnouncement.mockResolvedValue({ data: { data: { ...ACTIVE, title: 'Judul baru' } } })
    renderPage()

    expect(await screen.findByText('Sedang tayang')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ubah' }))
    expect(screen.getByRole('button', { name: /^Tetap sampai/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    const title = screen.getByLabelText('Judul')
    await user.clear(title)
    await user.type(title, 'Judul baru')
    await user.click(screen.getByRole('button', { name: 'Simpan perubahan' }))

    expect(api.saveAnnouncement).toHaveBeenCalledWith({
      title: 'Judul baru',
      body: 'Pelayanan dibuka lagi Senin.',
      link_url: null,
    })
  })

  it('deletes the announcement after confirmation', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    api.getAnnouncement.mockResolvedValue({ data: { data: ACTIVE } })
    api.deleteAnnouncement.mockResolvedValue({})
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Hapus' }))

    expect(api.deleteAnnouncement).toHaveBeenCalled()
    await waitFor(() => expect(screen.getByText(/Belum ada pengumuman/)).toBeInTheDocument())
  })

  it('shows the validation message from the server', async () => {
    const user = userEvent.setup()
    api.getAnnouncement.mockResolvedValue({ data: { data: null } })
    api.saveAnnouncement.mockRejectedValue({
      response: { data: { errors: { link_url: ['Link harus diawali https://'] } } },
    })
    renderPage()

    await user.type(await screen.findByLabelText('Judul'), 'Info')
    await user.type(screen.getByLabelText('Link (opsional)'), 'http://contoh.id')
    await user.click(screen.getByRole('button', { name: '1 hari' }))
    await user.click(screen.getByRole('button', { name: 'Tayangkan pengumuman' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Link harus diawali https://')
  })
})
