import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, WheelEvent } from 'react'
import { createPortal } from 'react-dom'
import { Minus, Plus } from 'lucide-react'

import '@/styles/photo-crop.css'

/**
 * Ukuran mutlak semua foto profil dan pejabat: persegi 1:1, hasil 1080 x
 * 1080 px. Persegi pas di avatar bulat dan kartu pejabat; 1080 px tetap
 * tajam saat petugas memperbesar foto. Backend menolak foto yang tidak
 * persegi (dimensions:ratio=1/1).
 */
export const PHOTO_OUTPUT_SIZE = 1080

const MAX_ZOOM = 4
const ZOOM_STEP = 0.1
// Geser per tekan tombol panah, dalam bagian dari lebar bingkai.
const KEY_STEP = 0.03

type Offset = { x: number; y: number }

type PhotoCropDialogProps = {
  source: Blob
  title?: string
  confirmLabel?: string
  onCancel: () => void
  onConfirm: (photo: File) => void
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * Memotong foto menjadi persegi 1080 x 1080. Bingkai potong selalu persegi
 * dan ukurannya tetap; yang berubah hanya zoom dan posisi foto di dalamnya,
 * jadi hasilnya sama berapa pun zoom-nya. Lingkaran putus-putus
 * menunjukkan bagian yang tampil di avatar bulat.
 */
export function PhotoCropDialog({
  source,
  title = 'Atur Foto',
  confirmLabel = 'Gunakan foto',
  onCancel,
  onConfirm,
}: PhotoCropDialogProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ pointerId: number; x: number; y: number; start: Offset } | null>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [frameSize, setFrameSize] = useState(0)
  const [zoom, setZoom] = useState(1)
  // Pergeseran pusat foto dari pusat bingkai, dalam bagian dari lebar bingkai.
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(source)
    const element = new Image()

    element.onload = () => {
      setImage(element)
      setUrl(objectUrl)
    }
    element.onerror = () => setFailed(true)
    element.src = objectUrl

    return () => URL.revokeObjectURL(objectUrl)
  }, [source])

  useEffect(() => {
    const frame = frameRef.current

    if (!frame) return

    const measure = () => setFrameSize(frame.clientWidth)
    measure()

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(frame)

    return () => observer?.disconnect()
  }, [])

  // Skala dasar: foto menutupi bingkai penuh pada zoom 1.
  const natural = useMemo(
    () => (image ? { width: image.naturalWidth, height: image.naturalHeight } : null),
    [image],
  )
  const baseScale = natural ? 1 / Math.min(natural.width, natural.height) : 0

  // Batas geser supaya bingkai tidak pernah memperlihatkan area kosong.
  const limits = useCallback(
    (nextZoom: number) => {
      if (!natural) return { x: 0, y: 0 }

      const scale = baseScale * nextZoom

      return {
        x: Math.max(0, (natural.width * scale - 1) / 2),
        y: Math.max(0, (natural.height * scale - 1) / 2),
      }
    },
    [natural, baseScale],
  )

  const place = useCallback(
    (next: Offset, nextZoom: number) => {
      const limit = limits(nextZoom)

      setOffset({ x: clamp(next.x, -limit.x, limit.x), y: clamp(next.y, -limit.y, limit.y) })
    },
    [limits],
  )

  const changeZoom = (value: number) => {
    const nextZoom = clamp(value, 1, MAX_ZOOM)

    setZoom(nextZoom)
    place(offset, nextZoom)
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, start: offset }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current

    if (!current || current.pointerId !== event.pointerId || !frameSize) return

    place(
      {
        x: current.start.x + (event.clientX - current.x) / frameSize,
        y: current.start.y + (event.clientY - current.y) / frameSize,
      },
      zoom,
    )
  }

  const endDrag = () => {
    drag.current = null
  }

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    changeZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, Offset> = {
      ArrowLeft: { x: KEY_STEP, y: 0 },
      ArrowRight: { x: -KEY_STEP, y: 0 },
      ArrowUp: { x: 0, y: KEY_STEP },
      ArrowDown: { x: 0, y: -KEY_STEP },
    }
    const move = moves[event.key]

    if (move) {
      event.preventDefault()
      place({ x: offset.x + move.x, y: offset.y + move.y }, zoom)
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      changeZoom(zoom + ZOOM_STEP)
    } else if (event.key === '-') {
      event.preventDefault()
      changeZoom(zoom - ZOOM_STEP)
    }
  }

  const confirm = () => {
    if (!image || !natural) return

    // Bagian foto (piksel asli) yang terlihat di bingkai.
    const scale = baseScale * zoom
    const side = 1 / scale
    const sx = natural.width / 2 - (0.5 + offset.x) / scale
    const sy = natural.height / 2 - (0.5 + offset.y) / scale

    const canvas = document.createElement('canvas')
    canvas.width = PHOTO_OUTPUT_SIZE
    canvas.height = PHOTO_OUTPUT_SIZE
    const context = canvas.getContext('2d')

    if (!context) return

    context.imageSmoothingQuality = 'high'
    context.drawImage(image, sx, sy, side, side, 0, 0, PHOTO_OUTPUT_SIZE, PHOTO_OUTPUT_SIZE)

    setSaving(true)
    canvas.toBlob(
      (blob) => {
        setSaving(false)
        if (blob) onConfirm(new File([blob], 'foto.jpg', { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.9,
    )
  }

  const scaled = natural ? baseScale * zoom * frameSize : 0

  return createPortal(
    <div className="sid-modal-overlay sid-photo-crop-overlay">
      <div
        className="sid-modal sid-photo-crop-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-crop-heading"
      >
        <div className="sid-dialog-heading">
          <h2 id="photo-crop-heading">{title}</h2>
          <p>Geser foto dan atur zoom. Bagian dalam lingkaran tampil di foto profil.</p>
        </div>

        <div
          ref={frameRef}
          className="sid-photo-crop-frame"
          role="group"
          tabIndex={0}
          aria-label="Area potong foto. Tombol panah untuk menggeser, plus atau minus untuk zoom."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={onWheel}
          onKeyDown={onKeyDown}
        >
          {url && natural && frameSize > 0 && (
            <img
              src={url}
              alt="Foto yang sedang dipotong"
              draggable={false}
              style={{
                width: natural.width * baseScale * zoom * frameSize,
                height: natural.height * baseScale * zoom * frameSize,
                left: frameSize * (0.5 + offset.x) - (natural.width * scaled) / 2,
                top: frameSize * (0.5 + offset.y) - (natural.height * scaled) / 2,
              }}
            />
          )}
          <span className="sid-photo-crop-guide" aria-hidden="true" />
          {failed && <p className="sid-photo-crop-error">Foto tidak dapat dibuka.</p>}
        </div>

        <div className="sid-photo-crop-zoom">
          <button
            type="button"
            aria-label="Perkecil"
            onClick={() => changeZoom(zoom - ZOOM_STEP * 2)}
            disabled={zoom <= 1}
          >
            <Minus size={16} aria-hidden="true" />
          </button>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            aria-label="Zoom foto"
            onChange={(event) => changeZoom(Number(event.target.value))}
          />
          <button
            type="button"
            aria-label="Perbesar"
            onClick={() => changeZoom(zoom + ZOOM_STEP * 2)}
            disabled={zoom >= MAX_ZOOM}
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>

        <p className="sid-photo-crop-note">
          Hasil selalu persegi {PHOTO_OUTPUT_SIZE} x {PHOTO_OUTPUT_SIZE} px.
        </p>

        <div className="sid-modal-actions">
          <button type="button" className="sid-button sid-button-outline" onClick={onCancel}>
            Batal
          </button>
          <button
            type="button"
            className="sid-button sid-button-primary"
            onClick={confirm}
            disabled={!image || saving}
          >
            {saving ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
