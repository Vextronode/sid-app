import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import BeritaFormModal from './BeritaFormModal'

const categories = [
  { id: 1, name: 'Umum' },
  { id: 2, name: 'Budaya' },
  { id: 3, name: 'Pendidikan' },
]

const renderModal = (props = {}) => {
  const onSubmit = vi.fn().mockResolvedValue()
  render(
    <BeritaFormModal
      open
      onClose={vi.fn()}
      onSubmit={onSubmit}
      categories={categories}
      {...props}
    />,
  )
  return onSubmit
}

const fillRequired = () => {
  fireEvent.change(screen.getByLabelText('Judul *'), { target: { value: 'Judul' } })
  fireEvent.change(screen.getByLabelText('Konten *'), { target: { value: 'Isi berita' } })
}

describe('BeritaFormModal kategori', () => {
  it('blocks submit until at least one category is chosen', () => {
    const onSubmit = renderModal()
    fillRequired()

    fireEvent.click(screen.getByRole('button', { name: /Simpan Berita/ }))

    expect(screen.getByRole('alert')).toHaveTextContent('Pilih minimal 1 kategori berita.')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('allows at most two categories', () => {
    const onSubmit = renderModal()
    fillRequired()

    fireEvent.click(screen.getByLabelText('Umum'))
    fireEvent.click(screen.getByLabelText('Budaya'))

    expect(screen.getByLabelText('Pendidikan')).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /Simpan Berita/ }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ category_ids: [1, 2] }))
  })

  it('preselects the categories of the news being edited', () => {
    renderModal({
      initialData: {
        id: 9,
        title: 'Lama',
        content: 'Isi',
        categories: [{ id: 3, name: 'Pendidikan' }],
      },
    })

    expect(screen.getByLabelText('Pendidikan')).toBeChecked()
    expect(screen.getByLabelText('Umum')).not.toBeChecked()
  })
})
