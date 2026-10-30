import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuth } from '@/features/auth/contexts/AuthContext'
import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'
import { getBerandaContent } from '../berandaContent'
import { BerandaHeader } from './BerandaHeader'

const mockedUseAuth = vi.mocked(useAuth, { partial: true, deep: true })
const mockedUsePublicVillageInfo = vi.mocked(usePublicVillageInfo, { partial: true, deep: true })

vi.mock('@/features/info-desa/usePublicVillageInfo', () => ({
  usePublicVillageInfo: vi.fn(),
}))

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const renderHeader = () => {
  const utils = render(
    <MemoryRouter>
      <BerandaHeader content={getBerandaContent()} />
      <p>Konten di luar header</p>
      <section id="kontak">Kontak</section>
    </MemoryRouter>,
  )
  const desktopNav = within(utils.container.querySelector('.bd-nav'))
  const mobileMenu = within(utils.container.querySelector('.bd-mobile-menu'))
  return { ...utils, desktopNav, mobileMenu }
}

describe('BerandaHeader', () => {
  beforeEach(() => {
    mockedUsePublicVillageInfo.mockReturnValue({
      village: {
        name: 'Cibenda',
        district: 'Parigi',
        regency: 'Pangandaran',
        logo_url: '/assets/image/lambang-kabupaten-pangandaran.webp',
      },
      stats: null,
      contacts: [],
    })
    mockedUseAuth.mockReturnValue({ user: null, isLoading: false })
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
    delete Element.prototype.scrollIntoView
  })

  describe('identitas dan tautan (A1, A2, A8, A9)', () => {
    it('shows the village name and region from the API, linking to the home page', () => {
      renderHeader()

      const brand = screen.getByRole('link', { name: /Desa Cibenda/ })
      expect(brand).toHaveAttribute('href', '/')
      expect(brand).toHaveTextContent('Kec. Parigi · Kab. Pangandaran')
    })

    // Tidak ada nama desa yang ditulis di kode: selagi data belum termuat
    // tampil nama netral, dan tempat lambang tetap dipesan.
    it('falls back to a neutral name without emblem or region while data is missing', () => {
      mockedUsePublicVillageInfo.mockReturnValue({ village: null, stats: null, contacts: [] })
      const { container } = renderHeader()

      const brand = screen.getByRole('link', { name: 'Desa' })
      expect(brand).not.toHaveTextContent('Kec.')
      expect(container.querySelector('img.bd-brand-mark')).toBeNull()
      expect(container.querySelector('span.bd-brand-mark')).toHaveAttribute('aria-hidden', 'true')
    })

    it('does not double the "Desa" prefix stored by the backend', () => {
      mockedUsePublicVillageInfo.mockReturnValue({
        village: { name: 'Desa Cibenda' },
        stats: null,
        contacts: [],
      })
      renderHeader()

      expect(screen.getByRole('link', { name: 'Desa Cibenda' })).toBeInTheDocument()
      expect(screen.queryByText(/Desa Desa/)).toBeNull()
    })

    it('shows the village emblem from the API instead of the "CB" monogram', () => {
      const { container } = renderHeader()

      const mark = container.querySelector('.bd-brand-mark')
      expect(mark.tagName).toBe('IMG')
      expect(mark).toHaveAttribute('src', '/assets/image/lambang-kabupaten-pangandaran.webp')
      expect(mark).toHaveAttribute('alt', '')
      expect(screen.queryByText('CB')).toBeNull()
    })

    it('uses the route constants for the desktop nav links', () => {
      const { desktopNav } = renderHeader()

      expect(desktopNav.getByRole('link', { name: 'Beranda' })).toHaveAttribute('href', '/')
      expect(desktopNav.getByRole('link', { name: 'Berita' })).toHaveAttribute('href', '/berita')
      expect(desktopNav.getByRole('link', { name: 'Kontak' })).toHaveAttribute('href', '/#kontak')
      expect(desktopNav.getByRole('link', { name: 'Masuk' })).toHaveAttribute('href', '/login')
    })

    // Sudah login: tombol akun menuju dashboard (lewat GuestRoute di /login).
    it('shows "Dashboard Saya" instead of "Masuk" for a logged-in user', async () => {
      mockedUseAuth.mockReturnValue({ user: { role: 'staf_sid' }, isLoading: false })
      const user = userEvent.setup()
      const { desktopNav, mobileMenu } = renderHeader()

      expect(desktopNav.getByRole('link', { name: 'Dashboard Saya' })).toHaveAttribute(
        'href',
        '/login',
      )
      expect(desktopNav.queryByRole('link', { name: 'Masuk' })).toBeNull()

      await user.click(mobileMenu.getByRole('button', { name: 'Menu' }))
      expect(mobileMenu.getByRole('link', { name: 'Dashboard Saya' })).toHaveAttribute(
        'href',
        '/login',
      )
    })

    it('marks Beranda as the current page only on the home page', () => {
      const { desktopNav } = renderHeader()
      expect(desktopNav.getByRole('link', { name: 'Beranda' })).toHaveAttribute(
        'aria-current',
        'page',
      )

      const { container } = render(
        <MemoryRouter initialEntries={['/berita']}>
          <BerandaHeader content={getBerandaContent()} />
        </MemoryRouter>,
      )
      const otherNav = within(container.querySelector('.bd-nav'))
      expect(otherNav.getByRole('link', { name: 'Beranda' })).not.toHaveAttribute('aria-current')
    })

    const navAt = (path: string) => {
      const { container } = render(
        <MemoryRouter initialEntries={[path]}>
          <BerandaHeader content={getBerandaContent()} />
        </MemoryRouter>,
      )
      return within(container.querySelector('.bd-nav'))
    }

    it('marks Berita as the current page on the news list and a news detail', () => {
      expect(navAt('/berita').getByRole('link', { name: 'Berita' })).toHaveAttribute(
        'aria-current',
        'page',
      )
      expect(navAt('/berita/kerja-bakti').getByRole('link', { name: 'Berita' })).toHaveAttribute(
        'aria-current',
        'page',
      )
    })

    it.each(['/profil-desa', '/bpd', '/lembaga-desa'])(
      'marks Tentang Desa as the current section on %s, not Kontak',
      (path) => {
        const nav = navAt(path)

        expect(nav.getByRole('button', { name: 'Tentang Desa' })).toHaveAttribute(
          'aria-current',
          'page',
        )
        expect(nav.getByRole('link', { name: 'Berita' })).not.toHaveAttribute('aria-current')
        expect(nav.getByText('Kontak')).not.toHaveAttribute('aria-current')
      },
    )

    it('does not mark Tentang Desa on the home page', () => {
      expect(navAt('/').getByRole('button', { name: 'Tentang Desa' })).not.toHaveAttribute(
        'aria-current',
      )
    })

    it('drops the Sejarah & visi misi item (part of Profil desa)', async () => {
      const user = userEvent.setup()
      const { desktopNav } = renderHeader()
      await user.click(desktopNav.getByRole('button', { name: 'Tentang Desa' }))

      expect(desktopNav.queryByText('Sejarah & visi misi')).toBeNull()
      expect(desktopNav.queryByRole('button', { name: 'Profil Desa' })).toBeNull()
    })

    it('scrolls to the contact section when Kontak is chosen', async () => {
      const user = userEvent.setup()
      const { desktopNav } = renderHeader()

      await user.click(desktopNav.getByRole('link', { name: 'Kontak' }))

      expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1)
      expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts[0]).toBe(
        document.getElementById('kontak'),
      )
    })

    it('goes to the home page contact section when Kontak is chosen on another page', async () => {
      const user = userEvent.setup()
      const LocationProbe = () => {
        const { pathname, hash } = useLocation()
        return <p data-testid="location">{pathname + hash}</p>
      }
      const { container } = render(
        <MemoryRouter initialEntries={['/berita']}>
          <BerandaHeader content={getBerandaContent()} />
          <LocationProbe />
        </MemoryRouter>,
      )

      await user.click(
        within(container.querySelector('.bd-nav')).getByRole('link', { name: 'Kontak' }),
      )

      expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
      expect(screen.getByTestId('location')).toHaveTextContent('/#kontak')
    })
  })

  describe('dropdown Tentang Desa (A3–A7)', () => {
    const openDropdown = async (
      user: ReturnType<typeof userEvent.setup>,
      desktopNav: ReturnType<typeof within>,
    ) => {
      const trigger = desktopNav.getByRole('button', { name: 'Tentang Desa' })
      await user.click(trigger)
      return trigger
    }

    it('is a button wired to its panel with aria-expanded and aria-controls', async () => {
      const user = userEvent.setup()
      const { desktopNav } = renderHeader()
      const trigger = desktopNav.getByRole('button', { name: 'Tentang Desa' })
      const panel = document.getElementById(trigger.getAttribute('aria-controls'))

      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(panel).not.toBeVisible()

      await user.click(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      expect(panel).toBeVisible()

      await user.click(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })

    // Data APBDes belum ada: butirnya teks biasa berlabel "Segera hadir".
    it('shows Transparansi APBDes as plain, unfocusable "Segera hadir" text', async () => {
      const user = userEvent.setup()
      const { desktopNav, mobileMenu } = renderHeader()
      await openDropdown(user, desktopNav)

      const item = desktopNav.getByText('Transparansi APBDes').closest('li')
      expect(item).toHaveTextContent('Segera hadir')
      expect(item.querySelector('a, button, [tabindex]')).toBeNull()
      expect(desktopNav.queryByText('Peta wilayah')).toBeNull()

      await user.click(mobileMenu.getByRole('button', { name: 'Menu' }))
      expect(mobileMenu.queryByRole('link', { name: /Transparansi APBDes/ })).toBeNull()
      expect(mobileMenu.getByText('Transparansi APBDes')).toBeVisible()
    })

    it('stays open on a click on a "Segera hadir" item', async () => {
      const user = userEvent.setup()
      const { desktopNav } = renderHeader()
      const trigger = await openDropdown(user, desktopNav)

      await user.click(desktopNav.getByText('Transparansi APBDes'))

      expect(trigger).toHaveAttribute('aria-expanded', 'true')
    })

    it('links Profil desa to the top of the village profile page and closes', async () => {
      const user = userEvent.setup()
      const { desktopNav } = renderHeader()
      const trigger = await openDropdown(user, desktopNav)
      const link = desktopNav.getByRole('link', { name: 'Profil desa' })

      expect(link).toHaveAttribute('href', '/profil-desa')

      await user.click(link)

      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })

    it('links Perangkat desa to its section on the village profile page and closes', async () => {
      const user = userEvent.setup()
      const { desktopNav } = renderHeader()
      const trigger = await openDropdown(user, desktopNav)
      const link = desktopNav.getByRole('link', { name: 'Perangkat desa' })

      expect(link).toHaveAttribute('href', '/profil-desa#perangkat-desa')
      expect(link).not.toHaveTextContent('Segera hadir')

      await user.click(link)

      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })

    it('links BPD and Lembaga Desa to their organisation pages', async () => {
      const user = userEvent.setup()
      const { desktopNav, mobileMenu } = renderHeader()
      await openDropdown(user, desktopNav)

      expect(desktopNav.getByRole('link', { name: 'BPD' })).toHaveAttribute('href', '/bpd')
      expect(desktopNav.getByRole('link', { name: 'Lembaga Desa' })).toHaveAttribute(
        'href',
        '/lembaga-desa',
      )

      await user.click(mobileMenu.getByRole('button', { name: 'Menu' }))
      expect(mobileMenu.getByRole('link', { name: 'BPD' })).toHaveAttribute('href', '/bpd')
      expect(mobileMenu.getByRole('link', { name: 'Lembaga Desa' })).toHaveAttribute(
        'href',
        '/lembaga-desa',
      )
    })

    it('links Peraturan desa to its section on the profile page', async () => {
      const user = userEvent.setup()
      const { desktopNav, mobileMenu } = renderHeader()
      await openDropdown(user, desktopNav)

      expect(desktopNav.getByRole('link', { name: 'Peraturan desa' })).toHaveAttribute(
        'href',
        '/profil-desa#peraturan-desa',
      )

      await user.click(mobileMenu.getByRole('button', { name: 'Menu' }))
      expect(mobileMenu.getByRole('link', { name: 'Peraturan desa' })).toHaveAttribute(
        'href',
        '/profil-desa#peraturan-desa',
      )
    })

    it('closes on a click outside', async () => {
      const user = userEvent.setup()
      const { desktopNav } = renderHeader()
      const trigger = await openDropdown(user, desktopNav)

      await user.click(screen.getByText('Konten di luar header'))

      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })

    it('closes on Escape and returns focus to the trigger', async () => {
      const user = userEvent.setup()
      const { desktopNav } = renderHeader()
      const trigger = await openDropdown(user, desktopNav)
      await user.tab()
      expect(desktopNav.getByRole('link', { name: 'Profil desa' })).toHaveFocus()

      await user.keyboard('{Escape}')

      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(trigger).toHaveFocus()
    })

    it('closes when keyboard focus leaves the dropdown', async () => {
      const user = userEvent.setup()
      const { desktopNav } = renderHeader()
      const trigger = await openDropdown(user, desktopNav)

      await user.tab() // Profil desa
      await user.tab() // Perangkat desa
      await user.tab() // Peraturan desa
      await user.tab() // BPD
      await user.tab() // Lembaga Desa, butir terakhir yang bisa difokus
      expect(trigger).toHaveAttribute('aria-expanded', 'true')

      await user.tab() // Kontak, di luar dropdown
      expect(desktopNav.getByRole('link', { name: 'Kontak' })).toHaveFocus()
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })

    it('stays open while the page scrolls', async () => {
      const user = userEvent.setup()
      const { desktopNav } = renderHeader()
      const trigger = await openDropdown(user, desktopNav)

      fireEvent.scroll(window)
      fireEvent.scroll(document)

      expect(trigger).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('menu ponsel (K5)', () => {
    it('opens a list with every nav destination, using the same rules as the dropdown', async () => {
      const user = userEvent.setup()
      const { mobileMenu } = renderHeader()
      const button = mobileMenu.getByRole('button', { name: 'Menu' })
      const panel = document.getElementById(button.getAttribute('aria-controls'))

      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(panel).not.toBeVisible()

      await user.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'true')
      const list = within(panel)
      expect(list.getByRole('link', { name: 'Berita' })).toHaveAttribute('href', '/berita')
      expect(list.getByRole('link', { name: 'Beranda' })).toHaveAttribute('href', '/')
      expect(list.getByText('Tentang Desa')).toBeVisible()
      expect(list.queryByText('Sejarah & visi misi')).toBeNull()
      expect(list.getByRole('link', { name: 'Profil desa' })).toHaveAttribute(
        'href',
        '/profil-desa',
      )
      expect(list.getByRole('link', { name: 'Perangkat desa' })).toHaveAttribute(
        'href',
        '/profil-desa#perangkat-desa',
      )
      expect(list.getByText('Transparansi APBDes')).toBeVisible()
      expect(list.getByRole('link', { name: 'Kontak' })).toHaveAttribute('href', '/#kontak')
      expect(list.getByRole('link', { name: 'Masuk' })).toHaveAttribute('href', '/login')
    })

    it('closes on Escape and returns focus to the Menu button', async () => {
      const user = userEvent.setup()
      const { mobileMenu } = renderHeader()
      const button = mobileMenu.getByRole('button', { name: 'Menu' })
      await user.click(button)
      await user.tab()

      await user.keyboard('{Escape}')

      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(button).toHaveFocus()
    })

    it('closes on a click outside but not on scroll', async () => {
      const user = userEvent.setup()
      const { mobileMenu } = renderHeader()
      const button = mobileMenu.getByRole('button', { name: 'Menu' })
      await user.click(button)

      fireEvent.scroll(window)
      expect(button).toHaveAttribute('aria-expanded', 'true')

      await user.click(screen.getByText('Konten di luar header'))
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })

    it('closes and scrolls when Kontak is chosen', async () => {
      const user = userEvent.setup()
      const { mobileMenu } = renderHeader()
      const button = mobileMenu.getByRole('button', { name: 'Menu' })
      await user.click(button)

      await user.click(mobileMenu.getByRole('link', { name: 'Kontak' }))

      expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts[0]).toBe(
        document.getElementById('kontak'),
      )
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })
  })
})
