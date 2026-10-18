import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ getInfoPages: vi.fn(), saveInfoPage: vi.fn() }))

vi.mock('@/features/info-admin/api', () => api)
vi.mock('@/components/layout/SiteFooter', () => ({ SiteFooter: () => null }))

import KelolaHalamanInfoPage from './KelolaHalamanInfoPage'

const PAGES = [
  {
    page: 'ppid',
    title: 'PPID',
    schema: [
      { key: 'ppid_officer', type: 'text', label: 'PPID Desa', hint: 'Nama dan jabatan' },
      { key: 'periodic_info', type: 'list', label: 'Informasi berkala' },
      { key: 'ppid_email', type: 'email', label: 'Email PPID' },
    ],
    fields: { ppid_officer: null, periodic_info: ['Profil desa'], ppid_email: null },
    updated_at: null,
  },
  {
    page: 'aksesibilitas',
    title: 'Aksesibilitas',
    schema: [{ key: 'response_time', type: 'text', label: 'Jangka waktu tanggapan' }],
    fields: { response_time: null },
    updated_at: null,
  },
]

describe('KelolaHalamanInfoPage', () => {
  beforeEach(() => {
    api.getInfoPages.mockReset().mockResolvedValue({ data: { data: PAGES } })
    api.saveInfoPage.mockReset()
  })

  it('shows one tab per page and a single input or a dynamic list per field', async () => {
    render(<KelolaHalamanInfoPage />)

    expect(await screen.findByRole('tab', { name: 'PPID' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Aksesibilitas' })).toBeInTheDocument()
    expect(screen.getByLabelText('PPID Desa')).toHaveValue('')
    expect(screen.getByLabelText('Email PPID')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Informasi berkala, butir 1')).toHaveValue('Profil desa')
  })

  it('adds, edits and removes list items, then saves the page', async () => {
    const user = userEvent.setup()
    api.saveInfoPage.mockImplementation((page, fields) =>
      Promise.resolve({
        data: { data: { page, fields, updated_at: '2026-10-20T09:00:00+07:00' } },
      }),
    )
    render(<KelolaHalamanInfoPage />)

    await user.type(await screen.findByLabelText('PPID Desa'), 'Nama, Sekretaris Desa')
    const list = within(screen.getByRole('group', { name: 'Informasi berkala' }))
    await user.click(list.getByRole('button', { name: 'Tambah butir' }))
    await user.type(list.getByLabelText('Informasi berkala, butir 2'), 'APBDes')
    await user.click(list.getByRole('button', { name: 'Tambah butir' }))
    await user.type(list.getByLabelText('Informasi berkala, butir 3'), 'Peraturan desa')
    await user.click(list.getByRole('button', { name: 'Naikkan butir 3' }))
    await user.click(list.getByRole('button', { name: 'Hapus butir 1' }))
    await user.click(screen.getByRole('button', { name: 'Simpan PPID' }))

    expect(api.saveInfoPage).toHaveBeenCalledWith('ppid', {
      ppid_officer: 'Nama, Sekretaris Desa',
      periodic_info: ['Peraturan desa', 'APBDes'],
      ppid_email: null,
    })
    expect(await screen.findByRole('status')).toHaveTextContent('PPID disimpan.')
    expect(screen.getByText(/Terakhir disimpan/)).toBeInTheDocument()
  })

  it('switches to another page with the tabs', async () => {
    const user = userEvent.setup()
    render(<KelolaHalamanInfoPage />)

    await user.click(await screen.findByRole('tab', { name: 'Aksesibilitas' }))

    expect(screen.getByLabelText('Jangka waktu tanggapan')).toBeInTheDocument()
    expect(screen.queryByLabelText('PPID Desa')).toBeNull()
    expect(screen.getByRole('link', { name: /Lihat halaman/ })).toHaveAttribute(
      'href',
      '/aksesibilitas',
    )
  })

  it('shows the validation message from the server', async () => {
    const user = userEvent.setup()
    api.saveInfoPage.mockRejectedValue({
      response: { data: { errors: { ppid_email: ['Format email tidak valid'] } } },
    })
    render(<KelolaHalamanInfoPage />)

    await user.click(await screen.findByRole('button', { name: 'Simpan PPID' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Format email tidak valid')
  })
})
