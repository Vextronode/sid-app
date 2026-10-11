import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'
import { getBerandaContent } from '../berandaContent'
import { BerandaHeader } from './BerandaHeader'

vi.mock('@/features/info-desa/usePublicVillageInfo', () => ({
  usePublicVillageInfo: vi.fn(),
}))

const COMING_SOON = ['Sejarah & visi misi', 'Perangkat desa', 'Peta wilayah']

const renderHeader = ({ isDev = true } = {}) => {
  const utils = render(
    <MemoryRouter>
      <BerandaHeader content={getBerandaContent(isDev)} />
      <p>Konten di luar header</p>
      <section id="transparansi">Transparansi</section>
      <section id="kontak">Kontak</section>
    </MemoryRouter>,
  )
  const desktopNav = within(utils.container.querySelector('.bd-nav'))
  const mobileMenu = within(utils.container.querySelector('.bd-mobile-menu'))
  return { ...utils, desktopNav, mobileMenu }
}

describe('BerandaHeader', () => {
  beforeEach(() => {
    usePublicVillageInfo.mockReturnValue({
      village: { name: 'Cibenda', district: 'Parigi', regency: 'Pangandaran' },
      stats: null,
      contacts: [],
    })
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

    it('falls back to the configured name and hides the region while data is missing', () => {
      usePublicVillageInfo.mockReturnValue({ village: null, stats: null, contacts: [] })
      renderHeader()

      const brand = screen.getByRole('link', { name: 'Desa Cibenda' })
      expect(brand).not.toHaveTextContent('Kec.')
    })

    it('shows the decorative Pangandaran emblem instead of the "CB" monogram', () => {
      const { container } = renderHeader()

      const mark = container.querySelector('.bd-brand-mark')
      expect(mark.tagName).toBe('IMG')
      expect(mark).toHaveAttribute('src', '/assets/image/lambang-kabupaten-pangandaran.webp')
      expect(mark).toHaveAttribute('alt', '')
      expect(screen.queryByText('CB')).toBeNull()
    })

    it('uses the route constants for the desktop nav links', () => {
      const { desktopNav } = renderHeader()

      expect(desktopNav.getByRole('link', { name: 'Berita' })).toHaveAttribute('href', '/berita')
      expect(desktopNav.getByRole('link', { name: 'Kontak' })).toHaveAttribute('href', '#kontak')
      expect(desktopNav.getByRole('link', { name: 'Masuk Warga' })).toHaveAttribute(
        'href',
        '/loginpage',
      )
    })

    it('scrolls to the contact section when Kontak is chosen', async () => {
      const user = userEvent.setup()
      const { desktopNav } = renderHeader()

      await user.click(desktopNav.getByRole('link', { name: 'Kontak' }))

      expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1)
      expect(Element.prototype.scrollIntoView.mock.contexts[0]).toBe(
        document.getElementById('kontak'),
      )
    })
  })

  describe('dropdown Profil Desa (A3–A7)', () => {
    const openDropdown = async (user, desktopNav) => {
      const trigger = desktopNav.getByRole('button', { name: 'Profil Desa' })
      await user.click(trigger)
      return trigger
    }

    it('is a button wired to its panel with aria-expanded and aria-controls', async () => {
      const user = userEvent.setup()
      const { desktopNav } = renderHeader()
      const trigger = desktopNav.getByRole('button', { name: 'Profil Desa' })
      const panel = document.getElementById(trigger.getAttribute('aria-controls'))

      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(panel).not.toBeVisible()

      await user.click(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      expect(panel).toBeVisible()

      await user.click(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })

    it('renders "Segera hadir" items as plain, unfocusable text', async () => {
      const user = userEvent.setup()
      const { desktopNav } = renderHeader()
      await openDropdown(user, desktopNav)

      for (const label of COMING_SOON) {
        const item = desktopNav.getByText(label).closest('li')
        expect(item).toHaveTextContent('Segera hadir')
        expect(item.querySelector('a, button, [tabindex]')).toBeNull()
        expect(desktopNav.queryByRole('link', { name: new RegExp(label) })).toBeNull()
      }
    })

    it('closes on a click outside', async () => {
      const user = userEvent.setup()
      const { desktopNav } = renderHeader()
      const trigger = await openDropdown(user, desktopNav)

      await user.click(screen.getByText('Konten di luar header'))

      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })

    it('stays open on a click on a "Segera hadir" item', async () => {
      const user = userEvent.setup()
      const { desktopNav } = renderHeader()
      const trigger = await openDropdown(user, desktopNav)

      await user.click(desktopNav.getByText('Perangkat desa'))

      expect(trigger).toHaveAttribute('aria-expanded', 'true')
    })

    it('closes on Escape and returns focus to the trigger', async () => {
      const user = userEvent.setup()
      const { desktopNav } = renderHeader()
      const trigger = await openDropdown(user, desktopNav)
      await user.tab()
      expect(desktopNav.getByRole('link', { name: 'Transparansi APBDes' })).toHaveFocus()

      await user.keyboard('{Escape}')

      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(trigger).toHaveFocus()
    })

    it('closes when keyboard focus leaves the dropdown', async () => {
      const user = userEvent.setup()
      const { desktopNav } = renderHeader()
      const trigger = await openDropdown(user, desktopNav)

      await user.tab() // Transparansi APBDes, masih di dalam dropdown
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

    it('scrolls to Transparansi and closes when that item is chosen', async () => {
      const user = userEvent.setup()
      const { desktopNav } = renderHeader()
      const trigger = await openDropdown(user, desktopNav)
      const link = desktopNav.getByRole('link', { name: 'Transparansi APBDes' })
      expect(link).toHaveAttribute('href', '#transparansi')

      await user.click(link)

      expect(Element.prototype.scrollIntoView.mock.contexts[0]).toBe(
        document.getElementById('transparansi'),
      )
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })

    it('hides Transparansi APBDes in production, where the section is hidden', async () => {
      const user = userEvent.setup()
      const { desktopNav } = renderHeader({ isDev: false })
      await openDropdown(user, desktopNav)

      expect(desktopNav.queryByText('Transparansi APBDes')).toBeNull()
      expect(desktopNav.getByText('Peta wilayah')).toBeVisible()
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
      expect(list.getByText('Profil Desa')).toBeVisible()
      for (const label of COMING_SOON) {
        expect(list.queryByRole('link', { name: new RegExp(label) })).toBeNull()
        expect(list.getByText(label)).toBeVisible()
      }
      expect(list.getByRole('link', { name: 'Transparansi APBDes' })).toBeVisible()
      expect(list.getByRole('link', { name: 'Kontak' })).toHaveAttribute('href', '#kontak')
      expect(list.getByRole('link', { name: 'Masuk Warga' })).toHaveAttribute('href', '/loginpage')
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

      expect(Element.prototype.scrollIntoView.mock.contexts[0]).toBe(
        document.getElementById('kontak'),
      )
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })
  })
})
