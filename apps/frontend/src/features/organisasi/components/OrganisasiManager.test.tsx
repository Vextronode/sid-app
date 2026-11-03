import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { OrgMember, OrgPosition, OrgSlots } from '../types'

const hook = vi.hoisted(() => ({
  fillSlot: vi.fn(),
  editMember: vi.fn(),
  endMember: vi.fn(),
  uploadPhoto: vi.fn(),
  removePhoto: vi.fn(),
  refresh: vi.fn(),
  slots: {} as OrgSlots,
}))
const api = vi.hoisted(() => ({ lookupOrgCitizen: vi.fn() }))

vi.mock('../hooks/useOrganisasi', () => ({
  useOrganisasi: () => ({ ...hook, loading: false, error: null }),
}))
vi.mock('../api', () => api)
vi.mock('@/components/layout/SiteFooter', () => ({ SiteFooter: (): null => null }))
vi.mock('@/shared/lib/toast', () => ({ notifySuccess: vi.fn() }))

import OrganisasiManager from './OrganisasiManager'

const member = (overrides: Partial<OrgMember>): OrgMember => ({
  id: 1,
  position_id: 3,
  citizen_id: 'warga-1',
  nik_masked: '************0001',
  member_name: 'Siti Aminah',
  photo_img: null,
  phone_wa: null,
  started_at: '2026-11-03',
  ended_at: null,
  is_active: true,
  notes: null,
  ...overrides,
})

const position = (slot: OrgPosition['slot'], id: number, members: OrgMember[]): OrgPosition => ({
  id,
  village_id: 'desa-1',
  org_type: 'bpd',
  slot,
  position_label: slot,
  is_single_occupant: slot !== 'anggota',
  sort_order: id,
  is_active: true,
  members,
})

const renderManager = () =>
  render(<OrganisasiManager title="BPD" orgTypes={[{ value: 'bpd', label: 'BPD' }]} />)

describe('OrganisasiManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hook.slots = {
      ketua: position('ketua', 1, [
        member({
          id: 9,
          position_id: 1,
          member_name: 'Ketua Lama',
          nik_masked: '************0009',
          is_active: false,
          ended_at: '2026-11-03',
        }),
      ]),
      wakil_ketua: position('wakil_ketua', 2, []),
      anggota: position('anggota', 3, [member({})]),
    }
    hook.fillSlot.mockResolvedValue(undefined)
  })

  it('adds a member only from a village NIK and fills the name automatically', async () => {
    api.lookupOrgCitizen.mockResolvedValue({
      citizen_id: 'warga-2',
      name: 'Budi Santoso',
      nik_masked: '************0002',
    })
    renderManager()

    fireEvent.click(screen.getByRole('button', { name: /Tambah Anggota/ }))
    const save = screen.getByRole('button', { name: 'Simpan' })
    expect(save).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/NIK warga/), { target: { value: '3201010101010002' } })

    await waitFor(() => expect(screen.getByLabelText('Nama lengkap')).toHaveValue('Budi Santoso'))
    expect(api.lookupOrgCitizen).toHaveBeenCalledWith('3201010101010002')
    expect(save).toBeEnabled()

    fireEvent.click(save)
    await waitFor(() =>
      expect(hook.fillSlot).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ nik: '3201010101010002', phone_wa: null }),
        null,
      ),
    )
  })

  it('shows why a NIK cannot be used', async () => {
    api.lookupOrgCitizen.mockRejectedValue({
      response: { status: 404, data: { message: 'NIK tidak ditemukan di data warga desa ini.' } },
    })
    renderManager()

    fireEvent.click(screen.getByRole('button', { name: /Tambah Anggota/ }))
    fireEvent.change(screen.getByLabelText(/NIK warga/), { target: { value: '3201010101019999' } })

    expect(await screen.findByRole('alert')).toHaveTextContent('NIK tidak ditemukan')
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled()
  })

  it('lists history as NIK - name without any delete button', () => {
    renderManager()

    const history = screen.getAllByText(/Riwayat/)[0].closest('details') as HTMLElement
    expect(within(history).getByText('************0009')).toBeInTheDocument()
    expect(within(history).getByText('Ketua Lama')).toBeInTheDocument()
    expect(within(history).getByText(/3 Nov 2026 – 3 Nov 2026/)).toBeInTheDocument()
    expect(within(history).queryByRole('button', { name: /Hapus/ })).toBeNull()
  })

  it('ends a membership instead of deleting it', () => {
    renderManager()

    expect(screen.queryByRole('button', { name: /^Hapus Siti/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Akhiri keanggotaan Siti Aminah' }))

    expect(screen.getByRole('heading', { name: 'Akhiri Keanggotaan' })).toBeInTheDocument()
  })
})
