// ==========================================
// LetterDossierModal.tsx
// Kerangka popup detail surat "meja dokumen" yang dipakai semua peran:
// surat tampil besar di kiri (`preview`), berkas permohonan di kanan
// (`children`), aksi di footer. Isi tiap bagian ditentukan pemanggil
// sesuai peran (pemohon, RT/RW/Kadus, Kades/Sekdes, Kasi/Kaur).
// ==========================================

import '@/styles/surat-dokumen.css'
import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

import { StatusBadge } from '@/components/ui/StatusBadge'
import { OverdueBadge } from '@/components/ui/OverdueBadge'

export function LetterDossierModal({
  surat,
  fallbackTitle = 'Detail permohonan surat',
  loading = false,
  error = '',
  notFound = false,
  badges = null,
  preview,
  hint = null,
  actions = null,
  onClose,
  children,
}) {
  const titleId = useId()
  const closeRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    closeRef.current?.focus()

    // Escape yang sudah ditangani lapisan di atasnya (menu unduh, dialog
    // konfirmasi) ditandai defaultPrevented dan tidak menutup modal.
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !event.defaultPrevented) onCloseRef.current?.()
    }

    document.addEventListener('keydown', onKeyDown)

    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const ready = Boolean(surat) && !loading && !error && !notFound

  return (
    <div className="sid-modal-overlay sid-dossier-overlay">
      <div className="sid-dossier" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="sid-dossier-header">
          <div className="sid-dossier-heading">
            <h2 id={titleId}>{surat?.letter_type?.name ?? fallbackTitle}</h2>

            <div className="sid-dossier-heading-meta">
              <span className="sid-dossier-number">No. {surat?.letter_number ?? '-'}</span>
              {surat?.status && <StatusBadge status={surat.status} />}
              {surat?.is_overdue === true && <OverdueBadge isOverdue />}
              {badges}
            </div>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="sid-dossier-close"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </header>

        {notFound ? (
          <p className="sid-dossier-state">Surat tidak ditemukan.</p>
        ) : error ? (
          <p role="alert" className="sid-dossier-state sid-dossier-state-error">
            {error}
          </p>
        ) : !ready ? (
          <p className="sid-dossier-state">Memuat detail surat...</p>
        ) : (
          <>
            <div className="sid-dossier-body">
              <section className="sid-dossier-document" aria-label="Pratinjau surat">
                {preview}
              </section>

              <aside className="sid-dossier-panel">{children}</aside>
            </div>

            <footer className="sid-dossier-footer">
              <div className="sid-dossier-hint">{hint}</div>

              <div className="sid-dossier-footer-actions">
                {actions ?? (
                  <button type="button" className="sid-dossier-button-quiet" onClick={onClose}>
                    Tutup
                  </button>
                )}
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}

/** Keadaan kosong area dokumen (surat belum bisa dipratinjau). */
export function DossierDocumentEmpty({ icon: Icon, title, children }) {
  return (
    <div className="sid-dossier-document-empty">
      {Icon && <Icon size={36} aria-hidden="true" />}
      <p className="sid-dossier-document-empty-title">{title}</p>
      {children && <p className="sid-dossier-muted">{children}</p>}
    </div>
  )
}
