import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { confirmDialog, notifySuccess } = vi.hoisted(() => ({
  confirmDialog: vi.fn(),
  notifySuccess: vi.fn(),
}))
vi.mock('@/shared/lib/dialog', () => ({ confirmDialog, alertDialog: vi.fn() }))
vi.mock('@/shared/lib/toast', () => ({ notifySuccess }))

const { getLetterTypes, updateLetterType } = vi.hoisted(() => ({
  getLetterTypes: vi.fn(),
  updateLetterType: vi.fn(),
}))

vi.mock('../api/letterTypeApi', () => ({
  getLetterTypes,
  updateLetterType,
}))

import LetterTypeSettingsPanel from './LetterTypeSettingsPanel'

describe('LetterTypeSettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    confirmDialog.mockResolvedValue(true)
    getLetterTypes.mockResolvedValue([
      {
        id: 12,
        code: 'A04',
        name: 'Surat Keterangan Domisili',
        produces_letter: true,
        data_action: 'update_citizen',
        validity_days: 14,
        category: 'persuratan',
        assigned_role: 'kaur_tu_umum',
        is_active: true,
        status_label: 'aktif',
      },
      {
        id: 13,
        code: 'A05',
        name: 'Surat Keterangan Usaha',
        produces_letter: true,
        data_action: 'none',
        validity_days: 30,
        assigned_role: null,
        is_active: false,
        status_label: 'dinonaktifkan',
      },
      {
        id: 14,
        code: 'A06',
        name: 'Surat Draft',
        produces_letter: true,
        data_action: 'none',
        validity_days: null,
        assigned_role: null,
        is_active: false,
        status_label: 'draft',
      },
    ])
  })

  it('lists all types with status badges and reactivates an inactive type', async () => {
    updateLetterType.mockResolvedValue({
      data: { data: { id: 13, is_active: true, status_label: 'aktif' } },
    })

    render(<LetterTypeSettingsPanel />)

    const inactiveRow = (await screen.findByText('Surat Keterangan Usaha')).closest('tr')
    const draftRow = screen.getByText('Surat Draft').closest('tr')
    expect(getLetterTypes).toHaveBeenCalledWith({ includeInactive: true })
    expect(within(inactiveRow).getByText('Nonaktif')).toBeInTheDocument()
    expect(within(draftRow).getByText('Draft')).toBeInTheDocument()
    expect(within(draftRow).getByRole('button', { name: 'Aktifkan' })).toBeDisabled()

    fireEvent.click(within(inactiveRow).getByRole('button', { name: 'Aktifkan' }))

    await waitFor(() => {
      expect(updateLetterType).toHaveBeenCalledWith(13, { is_active: true })
    })
    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith(expect.stringContaining('berhasil diaktifkan')),
    )
    expect(within(inactiveRow).getByText('Aktif')).toBeInTheDocument()
    expect(within(inactiveRow).getByRole('button', { name: 'Nonaktifkan' })).toBeInTheDocument()
  })

  it('loads backend type metadata and saves editable settings through PUT', async () => {
    updateLetterType.mockResolvedValue({
      data: {
        data: {
          id: 12,
          validity_days: 30,
          category: 'pelayanan',
          assigned_role: 'kasi_pemerintahan',
        },
      },
    })

    render(<LetterTypeSettingsPanel />)

    const row = (await screen.findByText('Surat Keterangan Domisili')).closest('tr')
    expect(within(row).getByText('Surat + ubah data warga')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Masa berlaku Surat Keterangan Domisili'), {
      target: { value: '30' },
    })
    // Kategori menggantikan pilihan petugas; petugasnya mengikuti kategori.
    expect(within(row).getByText('Petugas: Kaur TU & Umum')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Kategori Surat Keterangan Domisili'), {
      target: { value: 'pelayanan' },
    })
    expect(within(row).getByText('Petugas: Kasi Pemerintahan')).toBeInTheDocument()
    expect(screen.queryByLabelText('Petugas Surat Keterangan Domisili')).not.toBeInTheDocument()
    fireEvent.click(within(row).getByRole('button', { name: 'Simpan' }))

    await waitFor(() => {
      expect(updateLetterType).toHaveBeenCalledWith(12, {
        validity_days: 30,
        category: 'pelayanan',
      })
    })
    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith(expect.stringContaining('berhasil disimpan')),
    )
  })
})
