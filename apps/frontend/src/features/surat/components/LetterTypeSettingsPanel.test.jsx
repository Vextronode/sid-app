import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    getLetterTypes.mockResolvedValue([
      {
        id: 12,
        code: 'A04',
        name: 'Surat Keterangan Domisili',
        category: { name: 'Administrasi' },
        validity_days: 14,
        assigned_role: 'kasi_pelayanan',
      },
    ])
  })

  it('loads backend type metadata and saves editable settings through PUT', async () => {
    updateLetterType.mockResolvedValue({
      data: {
        data: {
          id: 12,
          validity_days: 30,
          assigned_role: 'kaur_tu_umum',
        },
      },
    })

    render(<LetterTypeSettingsPanel />)

    expect(await screen.findByText('Administrasi')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Masa berlaku Surat Keterangan Domisili'), {
      target: { value: '30' },
    })
    fireEvent.change(screen.getByLabelText('Petugas Surat Keterangan Domisili'), {
      target: { value: 'kaur_tu_umum' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))

    await waitFor(() => {
      expect(updateLetterType).toHaveBeenCalledWith(12, {
        validity_days: 30,
        assigned_role: 'kaur_tu_umum',
      })
    })
    expect(await screen.findByRole('status')).toHaveTextContent('berhasil disimpan')
  })
})
