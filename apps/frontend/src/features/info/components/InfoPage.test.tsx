import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn() }))
const villageInfo = vi.hoisted(() => ({ usePublicVillageInfo: vi.fn() }))

vi.mock('@/lib/api', () => ({ default: api }))
vi.mock('@/features/info-desa/usePublicVillageInfo', () => villageInfo)

import { InfoPage } from './InfoPage'
import type { MockInstance } from 'vitest'

const VILLAGE = {
  name: 'Desa Cibenda',
  district: 'Parigi',
  regency: 'Pangandaran',
  province: 'Jawa Barat',
  phone: '(0265) 2640613',
  office_hours: 'Senin – Jumat, 08.00 – 16.00 WIB',
  email: 'kantor@desa.test',
}

const respond = (fields: Record<string, unknown> = {}, updatedAt: string | null = null) =>
  api.get.mockResolvedValue({ data: { data: { fields, updated_at: updatedAt } } })

const slots = (container: HTMLElement) =>
  [...container.querySelectorAll('mark.bd-info-slot')].map((mark) => mark.textContent)

describe('InfoPage', () => {
  let scrollTo: MockInstance

  beforeEach(() => {
    scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    villageInfo.usePublicVillageInfo.mockReturnValue({ village: VILLAGE })
    api.get.mockReset()
  })

  afterEach(() => {
    scrollTo.mockRestore()
  })

  // Isian yang belum diisi Staf SIDUTama tampil sebagai penanda kuning. Email
  // khusus yang kosong memakai email kantor desa, jadi bukan penanda.
  it.each([
    ['kebijakan-privasi', 4],
    ['aksesibilitas', 2],
    ['ppid', 9],
  ])('marks every empty field on %s as a yellow [placeholder]', async (page, count) => {
    respond()
    const { container } = render(<InfoPage page={page} />)

    await screen.findAllByRole('heading', { level: 2 })
    const marks = slots(container)
    expect(marks).toHaveLength(count)
    for (const mark of marks) expect(mark).toMatch(/^\[[^\]]+\]$/)
    // Tidak ada kurung siku di luar penanda, dan tidak ada kata "draf".
    expect(container.textContent.replace(/\[[^\]]+\]/g, '')).not.toMatch(/[[\]{}]/)
    expect(container.textContent).not.toMatch(/draf/i)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(api.get).toHaveBeenCalledWith(`/api/public/info-pages/${page}`, expect.anything())
  })

  it('keeps the placeholder inside the original sentence', async () => {
    respond()
    render(<InfoPage page="kebijakan-privasi" />)

    const paragraph = await screen.findByText(/Data disimpan di server yang dikelola/)
    expect(paragraph).toHaveTextContent(
      'Data disimpan di server yang dikelola [PENGELOLA SERVER] dan hanya dapat diakses oleh petugas berwenang. Data permohonan disimpan selama [JANGKA WAKTU PENYIMPANAN] sesuai ketentuan arsip desa.',
    )
    expect(screen.getByText('Berlaku sejak', { exact: false })).toHaveTextContent(
      'Berlaku sejak [TANGGAL BERLAKU].',
    )
  })

  it('builds the village identity from village data, not from code', async () => {
    respond()
    render(<InfoPage page="kebijakan-privasi" />)

    expect(
      await screen.findByText(
        /^Pemerintah Desa Cibenda, Kecamatan Parigi, Kabupaten Pangandaran, mengelola/,
      ),
    ).toBeInTheDocument()
    // Kontak sebagai daftar singkat; tanpa email khusus, email kantor desa dipakai.
    expect(
      screen.getByText('Datang ke Kantor Desa Cibenda, Senin – Jumat, 08.00 – 16.00 WIB'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Salin nomor telepon (0265) 2640613' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Salin alamat email kantor@desa.test' }),
    ).toBeInTheDocument()
  })

  it('copies the phone number when it is clicked', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    respond()
    render(<InfoPage page="ppid" />)

    await user.click(await screen.findByRole('button', { name: /Salin nomor telepon/ }))

    expect(writeText).toHaveBeenCalledWith('(0265) 2640613')
    expect(await screen.findByText('Nomor disalin')).toBeInTheDocument()
  })

  it('replaces placeholders with the saved fields', async () => {
    respond(
      {
        effective_date: '2026-11-01',
        server_manager: 'Diskominfo Pangandaran',
        retention_period: '5 tahun',
        registration_data: ['Nomor telepon'],
      },
      '2026-11-01T09:00:00+07:00',
    )
    const { container } = render(<InfoPage page="kebijakan-privasi" />)

    expect(await screen.findByText('Berlaku sejak 1 November 2026.')).toHaveClass('bd-info-status')
    expect(
      screen.getByText(
        'Data disimpan di server yang dikelola Diskominfo Pangandaran dan hanya dapat diakses oleh petugas berwenang. Data permohonan disimpan selama 5 tahun sesuai ketentuan arsip desa.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Nomor telepon')).toBeInTheDocument()
    expect(slots(container)).toEqual([])
  })

  it('fills list fields on PPID and keeps a slot for lists still empty', async () => {
    respond({
      ppid_officer: 'Nama Sekdes, Sekretaris Desa',
      periodic_info: ['Profil desa', 'APBDes dan realisasinya'],
    })
    const { container } = render(<InfoPage page="ppid" />)

    expect(await screen.findByText('PPID Desa: Nama Sekdes, Sekretaris Desa')).toBeInTheDocument()
    expect(screen.getByText('APBDes dan realisasinya')).toBeInTheDocument()
    expect(screen.getByText('Atasan PPID:', { exact: false })).toHaveTextContent(
      'Atasan PPID: [NAMA, JABATAN]',
    )
    expect(slots(container)).toContain('[DAFTAR, SESUAI PENETAPAN DESA]')
  })

  it('shows "Diperbarui" only after the page has been saved', async () => {
    respond()
    const { container, unmount } = render(<InfoPage page="ppid" />)
    await screen.findAllByRole('heading', { level: 2 })
    expect(container.querySelector('.bd-info-status')).toBeNull()
    unmount()

    respond({}, '2026-11-01T09:00:00+07:00')
    render(<InfoPage page="ppid" />)
    expect(await screen.findByText('Diperbarui 1 November 2026.')).toHaveClass('bd-info-status')
  })

  it('still shows the fixed text when the page data fails to load', async () => {
    api.get.mockRejectedValue(new Error('offline'))
    render(<InfoPage page="aksesibilitas" />)

    expect(
      await screen.findByRole('heading', { name: 'Standar yang kami ikuti' }),
    ).toBeInTheDocument()
  })
})
