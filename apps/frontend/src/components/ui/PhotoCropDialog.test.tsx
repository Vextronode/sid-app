import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PHOTO_OUTPUT_SIZE, PhotoCropDialog } from './PhotoCropDialog'

// jsdom tidak memuat gambar maupun menggambar kanvas: keduanya disimulasikan.
class FakeImage {
  naturalWidth = 2000
  naturalHeight = 1000
  onload: (() => void) | null = null
  onerror: (() => void) | null = null

  set src(_value: string) {
    setTimeout(() => this.onload?.(), 0)
  }
}

const drawImage = vi.fn()

describe('PhotoCropDialog', () => {
  beforeEach(() => {
    drawImage.mockClear()
    vi.stubGlobal('Image', FakeImage)
    URL.createObjectURL = vi.fn(() => 'blob:foto')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback) {
      callback(new Blob(['foto'], { type: 'image/jpeg' }))
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('crops the centre square at 1080 x 1080 by default', async () => {
    const onConfirm = vi.fn()
    render(<PhotoCropDialog source={new Blob(['x'])} onCancel={vi.fn()} onConfirm={onConfirm} />)

    const confirm = screen.getByRole('button', { name: 'Gunakan foto' })
    await waitFor(() => expect(confirm).toBeEnabled())
    fireEvent.click(confirm)

    // Foto 2000 x 1000: bagian tengah 1000 x 1000.
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      500,
      0,
      1000,
      1000,
      0,
      0,
      PHOTO_OUTPUT_SIZE,
      PHOTO_OUTPUT_SIZE,
    )
    const photo = onConfirm.mock.calls[0][0] as File
    expect(photo).toBeInstanceOf(File)
    expect(photo.type).toBe('image/jpeg')
  })

  it('keeps the same square output when zoomed in', async () => {
    const onConfirm = vi.fn()
    render(<PhotoCropDialog source={new Blob(['x'])} onCancel={vi.fn()} onConfirm={onConfirm} />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Gunakan foto' })).toBeEnabled())
    fireEvent.change(screen.getByRole('slider', { name: 'Zoom foto' }), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gunakan foto' }))

    // Zoom 2: bagian tengah 500 x 500, hasil tetap 1080 x 1080.
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      750,
      250,
      500,
      500,
      0,
      0,
      PHOTO_OUTPUT_SIZE,
      PHOTO_OUTPUT_SIZE,
    )
  })

  it('cancels without producing a photo', () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(<PhotoCropDialog source={new Blob(['x'])} onCancel={onCancel} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole('button', { name: 'Batal' }))

    expect(onCancel).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
