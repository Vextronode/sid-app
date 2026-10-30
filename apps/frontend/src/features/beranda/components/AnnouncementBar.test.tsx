import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getBerandaContent } from '../berandaContent'
import { formatAnnouncementUntil } from '../utils/announcement'
import { AnnouncementBar } from './AnnouncementBar'

const inOneHour = () => new Date(Date.now() + 3_600_000).toISOString()

const renderBar = (announcement) =>
  render(
    <MemoryRouter>
      <AnnouncementBar content={getBerandaContent()} announcement={announcement} />
    </MemoryRouter>,
  )

describe('AnnouncementBar', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the title and when it ends, without an expand button when there is nothing more', () => {
    const expiresAt = inOneHour()
    renderBar({ title: 'Posyandu Sabtu pagi', body: null, link_url: null, expires_at: expiresAt })

    const region = screen.getByRole('region', { name: 'Pengumuman desa' })
    expect(region).toHaveTextContent('Posyandu Sabtu pagi')
    expect(region).toHaveTextContent(`berlaku sampai ${formatAnnouncementUntil(expiresAt)}`)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('opens the body and an internal link with "Baca selengkapnya"', async () => {
    const user = userEvent.setup()
    renderBar({
      title: 'Kantor desa tutup Jumat siang',
      body: 'Pelayanan surat dibuka lagi Senin.',
      link_url: '/berita/12',
      expires_at: inOneHour(),
    })

    const toggle = screen.getByRole('button', { name: /Baca selengkapnya/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Pelayanan surat dibuka lagi Senin.')).toBeNull()

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAccessibleName(/Tutup/)
    expect(screen.getByText('Pelayanan surat dibuka lagi Senin.')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Lihat selengkapnya' })
    expect(link).toHaveAttribute('href', '/berita/12')
    expect(link).not.toHaveAttribute('target')
  })

  it('opens an external link in a new tab', async () => {
    const user = userEvent.setup()
    renderBar({
      title: 'Info kabupaten',
      body: null,
      link_url: 'https://pangandarankab.go.id/info',
      expires_at: inOneHour(),
    })

    await user.click(screen.getByRole('button', { name: /Baca selengkapnya/ }))

    const link = screen.getByRole('link', { name: /Lihat selengkapnya/ })
    expect(link).toHaveAttribute('href', 'https://pangandarankab.go.id/info')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toMatch(/\bnoopener\b/)
    expect(link).toHaveAccessibleName('Lihat selengkapnya (tab baru)')
  })

  it('renders nothing without an announcement or once it has expired', () => {
    const { container, unmount } = renderBar(null)
    expect(container).toBeEmptyDOMElement()
    unmount()

    const expired = renderBar({
      title: 'Lewat',
      expires_at: new Date(Date.now() - 1000).toISOString(),
    })
    expect(expired.container).toBeEmptyDOMElement()
  })

  it('disappears when its time runs out while the page stays open', () => {
    vi.useFakeTimers()
    renderBar({
      title: 'Sebentar lagi selesai',
      expires_at: new Date(Date.now() + 5000).toISOString(),
    })
    expect(screen.getByText('Sebentar lagi selesai')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(5001)
    })

    expect(screen.queryByText('Sebentar lagi selesai')).toBeNull()
  })
})
