// ==========================================
// DownloadSuratMenu.jsx
// Tombol "Unduh surat" dengan dua pilihan format:
// - digital: TTD Kepala Desa + stempel desa tercetak di surat
// - wet: area tanda tangan kosong, untuk dicetak lalu ditandatangani
//   dan distempel basah
// Formulir tanpa TTD Kepala Desa hanya punya satu format: tombol langsung.
// ==========================================

import '@/styles/surat-dokumen.css'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown, Download, PenLine, Stamp } from 'lucide-react'

import { downloadSuratPDF } from '@/features/cetak-surat/utils/generateSuratPDF'
import { isSignedByVillageHead } from '@/features/cetak-surat/utils/letterSigning'
import { alertDialog } from '@/shared/lib/dialog'
import { getApiErrorMessage } from '@/shared/lib/apiError'

const OPTIONS = [
  {
    template: 'digital',
    icon: Stamp,
    label: 'TTD & stempel digital',
    hint: 'Siap diserahkan ke pemohon',
  },
  {
    template: 'wet',
    icon: PenLine,
    label: 'Untuk tanda tangan basah',
    hint: 'Tanpa TTD dan stempel, dicetak lalu ditandatangani',
  },
]

const MENU_WIDTH = 288

export function DownloadSuratMenu({
  surat,
  label = 'Unduh surat',
  variant = 'primary',
  disabled = false,
  title,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [position, setPosition] = useState(null)

  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()

  // Menu memakai position: fixed supaya tidak terpotong oleh tabel atau
  // modal yang punya overflow.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      return
    }

    const rect = buttonRef.current.getBoundingClientRect()
    const left = Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8)
    const menuHeight = menuRef.current?.offsetHeight ?? 140
    const below = rect.bottom + 6
    const top = below + menuHeight > window.innerHeight - 8 ? rect.top - menuHeight - 6 : below

    setPosition({ top: Math.max(8, top), left: Math.max(8, left) })
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    menuRef.current?.querySelector('[role="menuitem"]')?.focus()

    const close = () => setOpen(false)
    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) {
        close()
      }
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        // Escape milik menu; jangan sampai ikut menutup modal di bawahnya.
        event.preventDefault()
        event.stopPropagation()
        close()
        buttonRef.current?.focus()
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const items = [...(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? [])]
        const index = items.indexOf(document.activeElement)
        const next = event.key === 'ArrowDown' ? index + 1 : index - 1
        items[(next + items.length) % items.length]?.focus()
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  const handleSelect = async (template) => {
    setOpen(false)
    setBusy(true)

    try {
      await downloadSuratPDF(surat, template)
    } catch (error) {
      alertDialog({
        title: 'Unduhan gagal',
        message: getApiErrorMessage(error, 'Gagal mengunduh surat.'),
      })
    } finally {
      setBusy(false)
    }
  }

  if (!isSignedByVillageHead(surat)) {
    return (
      <button
        type="button"
        className={`sid-download-trigger ${variant} ${className}`}
        disabled={disabled || busy}
        title={title}
        onClick={() => handleSelect('digital')}
      >
        <Download size={16} aria-hidden="true" />
        <span>{busy ? 'Menyiapkan...' : 'Unduh formulir'}</span>
      </button>
    )
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`sid-download-trigger ${variant} ${className}`}
        disabled={disabled || busy}
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setPosition(null)
          setOpen((value) => !value)
        }}
      >
        <Download size={16} aria-hidden="true" />
        <span>{busy ? 'Menyiapkan...' : label}</span>
        <ChevronDown size={14} aria-hidden="true" className="sid-download-chevron" />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Pilih format surat"
          className="sid-download-menu"
          style={{
            width: MENU_WIDTH,
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            visibility: position ? 'visible' : 'hidden',
          }}
        >
          {OPTIONS.map(({ template, icon: Icon, label: optionLabel, hint }) => (
            <button
              key={template}
              type="button"
              role="menuitem"
              className="sid-download-option"
              onClick={() => handleSelect(template)}
            >
              <span className="sid-download-option-icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              <span className="sid-download-option-text">
                <span className="sid-download-option-label">{optionLabel}</span>
                <span className="sid-download-option-hint">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
