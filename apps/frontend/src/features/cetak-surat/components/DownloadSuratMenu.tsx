// ==========================================
// DownloadSuratMenu.tsx
// Tombol "Unduh surat" dengan dua pilihan format:
// - digital: TTD Kepala Desa + stempel desa tercetak di surat
// - wet: area tanda tangan kosong, untuk dicetak lalu ditandatangani
//   dan distempel basah
// Formulir pelayanan (tanpa TTD Kepala Desa) juga punya dua format: TTD
// digital (TTD pemohon dan pihak terkait dari akun tercetak) atau TTD basah
// (dikosongkan). Satu dokumen: kedua format langsung menjadi pilihan;
// beberapa dokumen (surat.documents): format dipilih di atas daftar
// dokumen. Dokumen yang terbit bersama surat desa ikut menjadi pilihan menu.
// Baris tabel tidak membawa daftar dokumen, jadi `loadDetail` memuat
// rincian surat saat tombol ditekan.
// ==========================================

import '@/styles/surat-dokumen.css'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown, Download, FileText, PenLine, Stamp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { downloadSuratPDF } from '@/features/cetak-surat/utils/generateSuratPDF'
import { MAIN_DOCUMENT } from '@/features/cetak-surat/utils/letterDocuments'
import type { PdfTemplate, PrintableLetter } from '@/features/cetak-surat/utils/letterDocuments'
import { isSignedByVillageHead } from '@/features/cetak-surat/utils/letterSigning'
import { alertDialog } from '@/shared/lib/dialog'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import type { Id, LetterDocument } from '@/types'

type DownloadOption = {
  key: string
  template: PdfTemplate
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

const FORMAT_OPTIONS: DownloadOption[] = [
  {
    key: 'digital',
    template: 'digital',
    documentKey: MAIN_DOCUMENT,
    icon: Stamp,
    label: 'TTD & stempel digital',
    hint: 'Siap diserahkan ke pemohon',
  },
  {
    key: 'wet',
    template: 'wet',
    documentKey: MAIN_DOCUMENT,
    icon: PenLine,
    label: 'Untuk tanda tangan basah',
    hint: 'Tanpa TTD dan stempel, dicetak lalu ditandatangani',
  },
]

// Format formulir pelayanan.
const FORM_FORMATS: (Omit<DownloadOption, 'key' | 'template' | 'documentKey'> & {
  key: PdfTemplate
})[] = [
  {
    key: 'digital',
    icon: Stamp,
    label: 'TTD digital',
    hint: 'TTD pemohon dan pihak terkait dari akun tercetak',
  },
  {
    key: 'wet',
    icon: PenLine,
    label: 'TTD basah',
    hint: 'Tanpa TTD, dicetak lalu ditandatangani',
  },
]

function documentOption(
  document: LetterDocument,
  hint: string,
  template: PdfTemplate = 'digital',
): DownloadOption {
  return {
    key: `document-${document.key}`,
    template,
    documentKey: document.key,
    icon: FileText,
    label: document.title,
    hint,
  }
}

function formDocuments(surat: PrintableLetter | null | undefined): LetterDocument[] {
  const documents = surat?.documents ?? []
  const main = documents.find((document) => document.key === MAIN_DOCUMENT) ?? {
    key: MAIN_DOCUMENT,
    title: 'Formulir',
  }

  return [main, ...documents.filter((document) => document.key !== MAIN_DOCUMENT)]
}

// Formulir pelayanan berisi beberapa dokumen: format dipilih terpisah.
function hasFormatChoice(surat: PrintableLetter | null | undefined) {
  return !isSignedByVillageHead(surat) && formDocuments(surat).length > 1
}

function downloadOptions(
  surat: PrintableLetter | null | undefined,
  format: PdfTemplate = 'digital',
): DownloadOption[] {
  const documents = surat?.documents ?? []
  const extras = documents.filter((document) => document.key !== MAIN_DOCUMENT)

  if (!isSignedByVillageHead(surat)) {
    const forms = formDocuments(surat)

    if (forms.length === 1) {
      return FORM_FORMATS.map((option) => ({
        ...option,
        template: option.key,
        documentKey: forms[0].key,
      }))
    }

    return forms.map((document) => documentOption(document, 'Formulir untuk instansi', format))
  }

  return [
    ...FORMAT_OPTIONS,
    ...extras.map((document) => documentOption(document, 'Terbit bersama surat ini')),
  ]
}

const MENU_WIDTH = 288

export function DownloadSuratMenu({
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
  const current = detail ?? surat
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [format, setFormat] = useState<PdfTemplate>('digital')

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

    menuRef.current?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus()

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

  const options = downloadOptions(current, format)
  const triggerLabel = label

  const handleSelect = async (option: DownloadOption, target: PrintableLetter = current) => {
    setOpen(false)
    setBusy(true)

    try {
      await downloadSuratPDF(target, option.template, option.documentKey)
    } catch (error) {
      alertDialog({
        title: 'Unduhan gagal',
        message: getApiErrorMessage(error, 'Gagal mengunduh surat.'),
      })
    } finally {
      setBusy(false)
    }
  }

  // Muat rincian (daftar dokumen) dulu; satu pilihan langsung diunduh.
  const handleLazyOpen = async () => {
    setBusy(true)

    try {
      const loaded = await loadDetail(surat.id)
      const loadedOptions = downloadOptions(loaded)

      setDetail(loaded)
      setBusy(false)

      if (loadedOptions.length === 1) {
        await handleSelect(loadedOptions[0], loaded)
      } else {
        setPosition(null)
        setOpen(true)
      }
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

  if (options.length === 1) {
    return (
      <button
        type="button"
        className={`sid-download-trigger ${variant} ${className}`}
        disabled={disabled || busy}
        title={title}
        onClick={() => handleSelect(options[0])}
      >
        <Download size={16} aria-hidden="true" />
        <span>{busy ? 'Menyiapkan...' : triggerLabel}</span>
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
          aria-label="Pilih format surat"
          className="sid-download-menu"
          style={{
            width: MENU_WIDTH,
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            visibility: position ? 'visible' : 'hidden',
          }}
        >
          {hasFormatChoice(current) && (
            <div className="sid-download-format" role="group" aria-label="Format tanda tangan">
              {FORM_FORMATS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={format === option.key}
                  title={option.hint}
                  className="sid-download-format-option"
                  onClick={() => setFormat(option.key)}
                >
                  <option.icon size={14} aria-hidden="true" />
                  {option.label}
                </button>
              ))}
            </div>
          )}

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
