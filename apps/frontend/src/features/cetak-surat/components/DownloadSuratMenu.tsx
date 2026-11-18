// ==========================================
// DownloadSuratMenu.tsx
// Tombol "Unduh surat". Surat terbit tanpa TTD dan stempel (dibubuhkan basah
// di kantor desa). Menu berisi pilihan ukuran kertas (A4 | F4, bawaan F4;
// backend menskalakan PDF utuh) lalu dokumen yang terbit (surat.documents,
// dokumen utama lebih dulu). Baris tabel tidak membawa daftar dokumen, jadi
// `loadDetail` memuat rincian surat saat tombol ditekan.
// ==========================================

import '@/styles/surat-dokumen.css'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown, Download, FileText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { downloadSuratPDF } from '@/features/cetak-surat/utils/generateSuratPDF'
import { PaperSizeToggle } from '@/features/cetak-surat/components/PaperSizeToggle'
import { DEFAULT_PAPER, paperLabel } from '@/features/cetak-surat/utils/paperSize'
import {
  DATA_ONLY_RESULT_NOTE,
  MAIN_DOCUMENT,
  producesLetter,
} from '@/features/cetak-surat/utils/letterDocuments'
import { StatusPill } from '@/components/ui/StatusPill'
import type { PrintableLetter } from '@/features/cetak-surat/utils/letterDocuments'
import { isSignedByVillageHead } from '@/features/cetak-surat/utils/letterSigning'
import { alertDialog } from '@/shared/lib/dialog'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import type { Id, LetterDocument, PaperSize } from '@/types'

type DownloadOption = {
  key: string
  documentKey: string
  icon: LucideIcon
  label: string
  hint: string
}

type DownloadSuratMenuProps = {
  surat: PrintableLetter
  label?: string
  variant?: string
  disabled?: boolean
  title?: string
  className?: string
  // Memuat rincian surat (daftar dokumen) saat tombol ditekan, untuk baris tabel.
  loadDetail?: (id: Id) => Promise<PrintableLetter>
}

// Satu pilihan per dokumen yang terbit; dokumen utama lebih dulu.
function downloadOptions(surat: PrintableLetter | null | undefined): DownloadOption[] {
  const villageLetter = isSignedByVillageHead(surat)
  const documents = surat?.documents ?? []
  const main = documents.find((document) => document.key === MAIN_DOCUMENT) ?? {
    key: MAIN_DOCUMENT,
    title: villageLetter ? 'Surat' : 'Formulir',
  }

  return [main, ...documents.filter((document) => document.key !== MAIN_DOCUMENT)].map(
    (document: LetterDocument) => {
      const role = !villageLetter
        ? 'Formulir untuk instansi'
        : document.key === MAIN_DOCUMENT
          ? 'Surat utama'
          : 'Terbit bersama surat ini'

      return {
        key: `document-${document.key}`,
        documentKey: document.key,
        icon: FileText,
        label: document.title,
        hint: document.paper ? `${role} · template ${paperLabel(document.paper)}` : role,
      }
    },
  )
}

const MENU_WIDTH = 288

// Layanan pendataan (mis. CPMI): tidak ada surat untuk diunduh.
export function DownloadSuratMenu(props: DownloadSuratMenuProps) {
  if (!producesLetter(props.surat)) {
    return (
      <span title={DATA_ONLY_RESULT_NOTE}>
        <StatusPill tone="active">Data tersimpan</StatusPill>
      </span>
    )
  }

  return <LetterDownloadMenu {...props} />
}

function LetterDownloadMenu({
  surat,
  label = 'Unduh surat',
  variant = 'primary',
  disabled = false,
  title,
  className = '',
  loadDetail,
}: DownloadSuratMenuProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [detail, setDetail] = useState<PrintableLetter | null>(null)
  const [paper, setPaper] = useState<PaperSize>(DEFAULT_PAPER)
  const current = detail ?? surat
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
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

    menuRef.current?.querySelector<HTMLElement>('.sid-download-option')?.focus()

    const close = () => setOpen(false)
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node

      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        close()
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Escape milik menu; jangan sampai ikut menutup modal di bawahnya.
        event.preventDefault()
        event.stopPropagation()
        close()
        buttonRef.current?.focus()
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const items = [
          ...(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []),
        ]
        const index = items.indexOf(document.activeElement as HTMLElement)
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

  const options = downloadOptions(current)
  const triggerLabel = label

  const handleSelect = async (option: DownloadOption, target: PrintableLetter = current) => {
    setOpen(false)
    setBusy(true)

    try {
      await downloadSuratPDF(target, option.documentKey, paper)
    } catch (error) {
      alertDialog({
        title: 'Unduhan gagal',
        message: getApiErrorMessage(error, 'Gagal mengunduh surat.'),
      })
    } finally {
      setBusy(false)
    }
  }

  // Muat rincian (daftar dokumen) dulu, lalu buka menu.
  const handleLazyOpen = async () => {
    if (!loadDetail) return

    setBusy(true)

    try {
      const loaded = await loadDetail(surat.id)

      setDetail(loaded)
      setBusy(false)
      setPosition(null)
      setOpen(true)
    } catch (error) {
      setBusy(false)
      alertDialog({
        title: 'Unduhan gagal',
        message: getApiErrorMessage(error, 'Gagal memuat dokumen surat.'),
      })
    }
  }

  if (loadDetail && !detail) {
    return (
      <button
        type="button"
        className={`sid-download-trigger ${variant} ${className}`}
        disabled={disabled || busy}
        title={title}
        aria-haspopup="menu"
        aria-expanded={false}
        onClick={handleLazyOpen}
      >
        <Download size={16} aria-hidden="true" />
        <span>{busy ? 'Menyiapkan...' : triggerLabel}</span>
        <ChevronDown size={14} aria-hidden="true" className="sid-download-chevron" />
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
        <span>{busy ? 'Menyiapkan...' : triggerLabel}</span>
        <ChevronDown size={14} aria-hidden="true" className="sid-download-chevron" />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Pilih ukuran kertas dan dokumen"
          className="sid-download-menu"
          style={{
            width: MENU_WIDTH,
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            visibility: position ? 'visible' : 'hidden',
          }}
        >
          <PaperSizeToggle value={paper} onChange={setPaper} inMenu />

          {options.map((option) => {
            const { icon: Icon, label: optionLabel, hint } = option

            return (
              <button
                key={option.key}
                type="button"
                role="menuitem"
                className="sid-download-option"
                onClick={() => handleSelect(option)}
              >
                <span className="sid-download-option-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span className="sid-download-option-text">
                  <span className="sid-download-option-label">{optionLabel}</span>
                  <span className="sid-download-option-hint">{hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
