import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LetterTypePicker } from './LetterTypePicker'

const TYPES = [
  {
    id: 1,
    code: 'SKD',
    name: 'Surat Keterangan Domisili',
    description: 'Menerangkan domisili.',
    requirements_info: 'Fotokopi KTP.',
    validity_days: 30,
  },
  { id: 2, code: 'SKU', name: 'Surat Keterangan Usaha', signature_slots: [{ key: 'saksi' }] },
]

function renderPicker(props = {}) {
  const onSelect = vi.fn()

  render(
    <LetterTypePicker
      letterTypes={TYPES}
      loading={false}
      error=""
      selectedCode=""
      onSelect={onSelect}
      {...props}
    />,
  )

  return onSelect
}

describe('LetterTypePicker', () => {
  it('lists letter types as choices with their validity and signature needs', () => {
    const onSelect = renderPicker()

    expect(screen.getByText('Berlaku 30 hari')).toBeTruthy()
    expect(screen.getByText('Perlu tanda tangan')).toBeTruthy()

    fireEvent.click(screen.getByRole('radio', { name: /Surat Keterangan Usaha/ }))
    expect(onSelect).toHaveBeenCalledWith('SKU')
  })

  it('separates Persuratan Desa and Pelayanan Desa with a label', () => {
    renderPicker({
      letterTypes: [
        { id: 3, code: 'F01', name: 'Pelayanan Pindah', category: 'pelayanan' },
        { id: 1, code: 'A01', name: 'Surat Keterangan Usaha', category: 'persuratan' },
      ],
    })

    const titles = screen.getAllByRole('heading').map((heading) => heading.textContent)
    expect(titles).toEqual(['Persuratan Desa', 'Pelayanan Desa'])
    expect(screen.getByRole('region', { name: 'Pelayanan Desa' }).textContent).toContain(
      'Pelayanan Pindah',
    )
  })

  it('collapses to the chosen type with its requirements and lets the user change it', () => {
    const onSelect = renderPicker({ selectedCode: 'SKD' })

    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.getByText('Fotokopi KTP.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Ganti' }))
    expect(onSelect).toHaveBeenCalledWith('')
  })

  it('filters long lists by name', () => {
    const many = Array.from({ length: 8 }, (_, index) => ({
      id: index,
      code: `T${index}`,
      name: index === 7 ? 'Surat Pengantar SKCK' : `Surat Lain ${index}`,
    }))

    renderPicker({ letterTypes: many })
    fireEvent.change(screen.getByRole('searchbox', { name: 'Cari jenis surat' }), {
      target: { value: 'skck' },
    })

    expect(screen.getAllByRole('radio')).toHaveLength(1)
  })
})
