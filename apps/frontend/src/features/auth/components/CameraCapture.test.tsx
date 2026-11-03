import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CameraCapture } from './CameraCapture'

describe('CameraCapture', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('offers only the camera, never a file picker', () => {
    const { container } = render(<CameraCapture photo={null} onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Buka kamera' })).toBeTruthy()
    expect(container.querySelector('input[type="file"]')).toBeNull()
  })

  it('explains what to do when the camera cannot be opened', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new Error('NotAllowedError')) },
    })

    render(<CameraCapture photo={null} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Buka kamera' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Izinkan akses kamera')
    expect(screen.getByRole('button', { name: 'Coba buka kamera lagi' })).toBeTruthy()
  })

  it('shows the taken photo and lets the user retake it', () => {
    const onChange = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:foto', revokeObjectURL: vi.fn() })

    render(<CameraCapture photo={new Blob(['x'], { type: 'image/jpeg' })} onChange={onChange} />)

    expect(screen.getByAltText('Foto wajah yang akan dikirim').getAttribute('src')).toBe(
      'blob:foto',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Ulangi foto' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('opens the square crop step after taking a photo', async () => {
    const onChange = vi.fn()
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) },
    })
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLVideoElement.prototype, 'videoWidth', 'get').mockReturnValue(1280)
    vi.spyOn(HTMLVideoElement.prototype, 'videoHeight', 'get').mockReturnValue(960)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback) {
      callback(new Blob(['x'], { type: 'image/jpeg' }))
    })
    URL.createObjectURL = vi.fn(() => 'blob:tangkapan')
    URL.revokeObjectURL = vi.fn()

    render(<CameraCapture photo={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Buka kamera/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Ambil foto/ })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: /Ambil foto/ }))

    // Tangkapan belum dipakai sampai dipotong persegi.
    expect(screen.getByRole('dialog', { name: 'Atur Foto Wajah' })).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })
})
