import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { FileSpreadsheet } from 'lucide-react'

type ImportProgressOverlayProps = {
  title: string
  description: string
}

const formatElapsed = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/**
 * Lapisan penuh layar selama file impor diperiksa/diimpor. Sengaja memblokir
 * seluruh halaman: impor ribuan warga butuh beberapa menit dan tidak boleh
 * ditinggal atau terpotong. Menutup/memuat ulang tab ikut diperingatkan.
 */
export function ImportProgressOverlay({ title, description }: ImportProgressOverlayProps) {
  const [elapsed, setElapsed] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    panelRef.current?.focus()

    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeave)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('beforeunload', warnBeforeLeave)
    }
  }, [])

  // Fokus tidak boleh keluar ke tombol di belakang lapisan.
  const keepFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab' || event.key === 'Escape') event.preventDefault()
  }

  return (
    <div className="sid-import-progress" role="presentation">
      <div
        ref={panelRef}
        className="sid-import-progress-panel"
        role="alertdialog"
        aria-modal="true"
        aria-busy="true"
        aria-labelledby="import-progress-title"
        aria-describedby="import-progress-description"
        tabIndex={-1}
        onKeyDown={keepFocus}
      >
        <div className="sid-import-progress-visual" aria-hidden="true">
          <span className="sid-import-progress-ring" />
          <FileSpreadsheet size={28} className="sid-import-progress-icon" />
        </div>
        <h2 id="import-progress-title">{title}</h2>
        <p id="import-progress-description">{description}</p>
        <div className="sid-import-progress-bar" aria-hidden="true">
          <span />
        </div>
        <p className="sid-import-progress-meta">
          Berjalan <span aria-live="off">{formatElapsed(elapsed)}</span> · Jangan tutup atau muat
          ulang halaman ini.
        </p>
      </div>
    </div>
  )
}
