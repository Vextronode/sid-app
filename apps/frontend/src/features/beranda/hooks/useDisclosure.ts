import { useCallback, useEffect, useId, useRef, useState } from 'react'

// Buka/tutup dropdown dan menu ponsel beranda.
// Tertutup saat: klik/tap di luar, Escape (fokus kembali ke pemicu),
// fokus keyboard keluar dari wadah, atau pemanggil memanggil close() setelah
// item dipilih. Sengaja TIDAK tertutup saat halaman digulir.
//
// Pasang containerRef + onBlur di elemen yang membungkus pemicu dan panel,
// triggerRef di tombol pemicu, dan panelId di aria-controls / id panel.
export function useDisclosure() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const panelId = useId()

  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((open) => !open), [])

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      setIsOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // React onBlur = focusout (menggelembung). relatedTarget = elemen yang
  // menerima fokus berikutnya; null berarti fokus pindah ke luar dokumen
  // atau ke elemen yang tidak fokusabel (klik luar sudah ditangani di atas).
  const onBlur = useCallback((event) => {
    const next = event.relatedTarget
    if (next && !containerRef.current?.contains(next)) setIsOpen(false)
  }, [])

  return { isOpen, toggle, close, containerRef, triggerRef, panelId, onBlur }
}
