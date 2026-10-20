import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getAnnouncement: vi.fn(),
  saveAnnouncement: vi.fn(),
  deleteAnnouncement: vi.fn(),
}))

const beritaApi = vi.hoisted(() => ({ getBeritaList: vi.fn() }))

vi.mock('@/features/pengumuman/api', () => api)
vi.mock('@/features/kelola-berita/api', () => beritaApi)
vi.mock('@/features/info-desa/usePublicVillageInfo', () => ({
  refreshPublicVillageInfo: vi.fn(),
}))
vi.mock('@/components/layout/SiteFooter', () => ({ SiteFooter: () => null }))

const { confirmDialog } = vi.hoisted(() => ({ confirmDialog: vi.fn() }))
vi.mock('@/shared/lib/dialog', () => ({ confirmDialog, alertDialog: vi.fn() }))

import KelolaPengumumanPage from './KelolaPengumumanPage'

const ACTIVE = {
  title: 'Kantor desa tutup Jumat siang',
  body: 'Pelayanan dibuka lagi Senin.',
  link_url: null,
  expires_at: new Date(Date.now() + 5 * 3_600_000).toISOString(),
  updated_at: '2026-10-20T09:00:00+07:00',
}

const PUBLISHED = [
  { id: 12, title: 'Jadwal posyandu Oktober' },
  { id: 7, title: 'Hasil musyawarah desa' },
]

const renderPage = () =>
  render(
    <MemoryRouter>
      <KelolaPengumumanPage />
    </MemoryRouter>,
  )

describe('KelolaPengumumanPage', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset())
    beritaApi.getBeritaList.mockReset()
    beritaApi.getBeritaList.mockResolvedValue({ data: { data: PUBLISHED } })
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
    confirmDialog.mockResolvedValue(true)
    api.getAnnouncement.mockResolvedValue({ data: { data: ACTIVE } })
    api.deleteAnnouncement.mockResolvedValue({})
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Hapus' }))

    expect(confirmDialog).toHaveBeenCalledWith(
      expect.objectContaining({ title: `Hapus pengumuman "${ACTIVE.title}"?` }),
    )
    await waitFor(() => expect(api.deleteAnnouncement).toHaveBeenCalled())
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
    await user.click(screen.getByRole('button', { name: 'Link lain' }))
    await user.type(screen.getByLabelText('Alamat link'), 'http://contoh.id')
    await user.click(screen.getByRole('button', { name: '1 hari' }))
    await user.click(screen.getByRole('button', { name: 'Tayangkan pengumuman' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Link harus diawali https://')
  })

  it('links a published news item picked from the dropdown', async () => {
    const user = userEvent.setup()
    api.getAnnouncement.mockResolvedValue({ data: { data: null } })
    api.saveAnnouncement.mockResolvedValue({ data: { data: ACTIVE } })
    renderPage()

    await user.type(await screen.findByLabelText('Judul'), 'Posyandu')
    await user.click(screen.getByRole('button', { name: 'Berita desa' }))
    expect(beritaApi.getBeritaList).toHaveBeenCalledWith({ status: 'published' })
    await user.selectOptions(await screen.findByLabelText('Berita'), 'Jadwal posyandu Oktober')
    await user.click(screen.getByRole('button', { name: '1 hari' }))
    await user.click(screen.getByRole('button', { name: 'Tayangkan pengumuman' }))

    expect(api.saveAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({ link_url: '/berita/12' }),
    )
  })

  it('requires a news item when "Berita desa" is chosen', async () => {
    const user = userEvent.setup()
    api.getAnnouncement.mockResolvedValue({ data: { data: null } })
    renderPage()

    await user.type(await screen.findByLabelText('Judul'), 'Posyandu')
    await user.click(screen.getByRole('button', { name: 'Berita desa' }))
    await user.click(screen.getByRole('button', { name: '1 hari' }))
    await user.click(screen.getByRole('button', { name: 'Tayangkan pengumuman' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Pilih berita yang ingin ditautkan.')
    expect(api.saveAnnouncement).not.toHaveBeenCalled()
  })

  it('preselects the linked news item when editing', async () => {
    const user = userEvent.setup()
    api.getAnnouncement.mockResolvedValue({ data: { data: { ...ACTIVE, link_url: '/berita/7' } } })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Ubah' }))

    expect(screen.getByRole('button', { name: 'Berita desa' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await waitFor(() => expect(screen.getByLabelText('Berita')).toHaveValue('7'))
  })

  it('warns when the linked news item is no longer published', async () => {
    const user = userEvent.setup()
    api.getAnnouncement.mockResolvedValue({ data: { data: { ...ACTIVE, link_url: '/berita/99' } } })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Ubah' }))

    expect(
      await screen.findByText('Berita yang ditautkan sudah tidak tersedia. Pilih berita lain.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Berita')).toHaveValue('')
  })

  it('keeps an external link under "Link lain"', async () => {
    const user = userEvent.setup()
    api.getAnnouncement.mockResolvedValue({
      data: { data: { ...ACTIVE, link_url: 'https://pangandarankab.go.id/info' } },
    })
    api.saveAnnouncement.mockResolvedValue({ data: { data: ACTIVE } })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Ubah' }))
    expect(screen.getByLabelText('Alamat link')).toHaveValue('https://pangandarankab.go.id/info')
    await user.click(screen.getByRole('button', { name: 'Simpan perubahan' }))

    expect(api.saveAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({ link_url: 'https://pangandarankab.go.id/info' }),
    )
  })
})
