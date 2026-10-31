import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ resolveMapLink: vi.fn() }))

vi.mock('../api', () => api)

import EditProfilDesaModal from './EditProfilDesaModal'
import { partialFixture } from '@/test/fixtures'
import type { VillageProfileForm } from '../types'

const SHORT_LINK = 'https://maps.app.goo.gl/sVU5Xqmasq4UTJ4N6'

const initialData = partialFixture<VillageProfileForm>({
  name: 'Desa Cibenda',
  head_name: 'Dede Rusliana',
  latitude: null,
  longitude: null,
})

const renderModal = (data = initialData) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  render(<EditProfilDesaModal open onClose={vi.fn()} onSubmit={onSubmit} initialData={data} />)

  return { onSubmit, field: screen.getByLabelText('Lokasi Kantor Desa') }
}

describe('EditProfilDesaModal - lokasi kantor desa', () => {
  beforeEach(() => {
    api.resolveMapLink.mockReset()
  })

  it('shows the saved point as coordinates', () => {
    const { field } = renderModal({ ...initialData, latitude: -7.6803137, longitude: 108.5513816 })

    expect(field).toHaveValue('-7.6803137, 108.5513816')
  })

  it('turns a pasted Google Maps link into the office point before saving', async () => {
    const user = userEvent.setup()
    api.resolveMapLink.mockResolvedValue({
      data: { data: { latitude: -7.6803137, longitude: 108.5513816 } },
    })
    const { field, onSubmit } = renderModal()

    await user.click(field)
    await user.paste(SHORT_LINK)
    await user.click(screen.getByRole('button', { name: 'Ambil titik dari link' }))

    expect(api.resolveMapLink).toHaveBeenCalledWith(SHORT_LINK)
    expect(field).toHaveValue('-7.6803137, 108.5513816')
    expect(screen.getByRole('status')).toHaveTextContent('Titik ditemukan')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('resolves a link that is still in the field when saving', async () => {
    const user = userEvent.setup()
    api.resolveMapLink.mockResolvedValue({
      data: { data: { latitude: -7.6803137, longitude: 108.5513816 } },
    })
    const { field, onSubmit } = renderModal()

    await user.click(field)
    await user.paste(SHORT_LINK)
    await user.click(screen.getByRole('button', { name: /Simpan Perubahan/ }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      latitude: -7.6803137,
      longitude: 108.5513816,
    })
  })

  it('shows the backend message and does not save when the link has no point', async () => {
    const user = userEvent.setup()
    api.resolveMapLink.mockRejectedValue({
      response: { status: 422, data: { message: 'Titik lokasi tidak ditemukan dari link ini.' } },
    })
    const { field, onSubmit } = renderModal()

    await user.click(field)
    await user.paste('https://example.com/peta')
    await user.click(screen.getByRole('button', { name: /Simpan Perubahan/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Titik lokasi tidak ditemukan dari link ini.',
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('saves pasted coordinates without calling the backend', async () => {
    const user = userEvent.setup()
    const { field, onSubmit } = renderModal()

    await user.click(field)
    await user.paste('-7.68, 108.55')
    await user.click(screen.getByRole('button', { name: /Simpan Perubahan/ }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ latitude: -7.68, longitude: 108.55 })
    expect(api.resolveMapLink).not.toHaveBeenCalled()
  })

  it('rejects text that is neither a link nor coordinates', async () => {
    const user = userEvent.setup()
    const { field, onSubmit } = renderModal()

    await user.click(field)
    await user.paste('kantor desa')
    await user.click(screen.getByRole('button', { name: /Simpan Perubahan/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Tempel link Google Maps')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('clears the location so it is saved as empty', async () => {
    const user = userEvent.setup()
    const { field, onSubmit } = renderModal({
      ...initialData,
      latitude: -7.6803137,
      longitude: 108.5513816,
    })

    await user.click(screen.getByRole('button', { name: 'Hapus lokasi' }))
    expect(field).toHaveValue('')
    await user.click(screen.getByRole('button', { name: /Simpan Perubahan/ }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ latitude: null, longitude: null })
  })
})
