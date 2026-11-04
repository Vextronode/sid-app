import { useState } from 'react'
import type { MouseEvent } from 'react'

import '@/styles/aktivasi-akun.css'

type PhotoZoomProps = {
  src: string
  alt: string
}

const MAX_ZOOM = 3

/**
 * Foto yang bisa diperbesar: klik untuk memperbesar di titik yang diklik
 * (klik lagi untuk kembali), atau atur lewat penggeser.
 */
export function PhotoZoom({ src, alt }: PhotoZoomProps) {
  const [zoom, setZoom] = useState(1)
  const [origin, setOrigin] = useState('50% 50%')

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    if (zoom > 1) {
      setZoom(1)

      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100

    setOrigin(`${x}% ${y}%`)
    setZoom(2)
  }

  return (
    <div>
      <button
        type="button"
        className={`sid-photo-zoom${zoom > 1 ? ' is-zoomed' : ''}`}
        onClick={toggle}
        aria-label={zoom > 1 ? 'Perkecil foto' : 'Perbesar foto'}
        style={{ width: '100%', padding: 0 }}
      >
        <img src={src} alt={alt} style={{ transform: `scale(${zoom})`, transformOrigin: origin }} />
      </button>

      <label className="sid-photo-zoom-controls">
        <span>Perbesar</span>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.25}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
        />
        <span>{zoom.toFixed(2).replace(/\.?0+$/, '')}×</span>
      </label>
    </div>
  )
}
