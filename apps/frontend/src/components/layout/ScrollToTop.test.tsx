import { fireEvent, render, screen } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ScrollToTop } from './ScrollToTop'
import type { MockInstance } from 'vitest'

function Beranda() {
  const navigate = useNavigate()
  return (
    <>
      <Link to="/berita">Semua berita →</Link>
      <Link to="/profil-desa#perangkat-desa">Perangkat desa</Link>
      <button type="button" onClick={() => navigate(-1)}>
        Kembali
      </button>
    </>
  )
}

const renderAt = (entries: string[], index?: number) =>
  render(
    <MemoryRouter initialEntries={entries} initialIndex={index}>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Beranda />} />
        <Route path="/berita" element={<p>Halaman berita</p>} />
        <Route path="/profil-desa" element={<p>Halaman profil</p>} />
      </Routes>
    </MemoryRouter>,
  )

describe('ScrollToTop', () => {
  let scrollTo: MockInstance

  beforeEach(() => {
    scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  afterEach(() => vi.restoreAllMocks())

  it('opens a new page at the top', () => {
    renderAt(['/'])
    scrollTo.mockClear()

    fireEvent.click(screen.getByRole('link', { name: 'Semua berita →' }))

    expect(screen.getByText('Halaman berita')).toBeInTheDocument()
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('leaves section links to the target page', () => {
    renderAt(['/'])
    scrollTo.mockClear()

    fireEvent.click(screen.getByRole('link', { name: 'Perangkat desa' }))

    expect(screen.getByText('Halaman profil')).toBeInTheDocument()
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('lets the browser restore the position on back navigation', () => {
    renderAt(['/berita', '/'], 1)
    scrollTo.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'Kembali' }))

    expect(screen.getByText('Halaman berita')).toBeInTheDocument()
    expect(scrollTo).not.toHaveBeenCalled()
  })
})
