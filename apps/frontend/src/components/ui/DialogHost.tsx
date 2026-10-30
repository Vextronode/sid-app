import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Info, PenLine, Trash2, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { FormEvent } from 'react'

import { currentDialog, resolveDialog, subscribeDialogs } from '@/shared/lib/dialog'
import type { DialogChangeGroup, DialogEntry, DialogTone } from '@/shared/lib/dialog'

const ICONS: Record<DialogTone, LucideIcon> = {
  error: XCircle,
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info,
  danger: Trash2,
  primary: PenLine,
}

// Kartu dialog di tengah layar untuk alertDialog/confirmDialog/promptDialog.
// Dipasang sekali di main.tsx.
export function DialogHost() {
  const dialog = useSyncExternalStore(subscribeDialogs, currentDialog)

  if (!dialog) return null

  return createPortal(<DialogCard key={dialog.id} dialog={dialog} />, document.body)
}

function DialogCard({ dialog }: { dialog: DialogEntry }) {
  const { kind, title, message, tone } = dialog
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const primaryButton = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  const cancelValue = kind === 'confirm' ? false : kind === 'prompt' ? null : undefined
  const Icon = ICONS[tone] ?? Info

  useEffect(() => {
    ;(kind === 'prompt' ? input : primaryButton).current?.focus()

    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      // Escape ini milik dialog; jangan sampai ikut menutup form di bawahnya.
      event.stopImmediatePropagation()
      resolveDialog(cancelValue)
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [kind, cancelValue])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (dialog.kind === 'confirm') return resolveDialog(true)
    if (dialog.kind === 'alert') return resolveDialog(undefined)

    const trimmed = value.trim()
    if (trimmed.length < Math.max(dialog.minLength, 1)) {
      setError(
        dialog.minLength > 1 ? `Isian minimal ${dialog.minLength} karakter.` : 'Isian wajib diisi.',
      )
      return undefined
    }

    return resolveDialog(trimmed)
  }

  return (
    <div
      className="sid-modal-overlay sid-dialog-overlay"
      onClick={() => resolveDialog(cancelValue)}
    >
      <form
        role={kind === 'alert' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby="sid-dialog-title"
        aria-describedby={message ? 'sid-dialog-message' : undefined}
        className={`sid-modal sid-notice-modal sid-notice-modal--${tone}`}
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <span className="sid-notice-icon" aria-hidden="true">
          <Icon size={24} />
        </span>
        <h2 id="sid-dialog-title">{title}</h2>
        {message && <p id="sid-dialog-message">{message}</p>}
        {dialog.kind === 'confirm' && dialog.details && dialog.details.length > 0 && (
          <ChangeDetails groups={dialog.details} />
        )}

        {dialog.kind === 'prompt' && (
          <div className="sid-notice-field">
            <label htmlFor="sid-dialog-input">{dialog.label}</label>
            <textarea
              id="sid-dialog-input"
              ref={input}
              rows={3}
              value={value}
              placeholder={dialog.placeholder}
              onChange={(event) => {
                setValue(event.target.value)
                setError('')
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'sid-dialog-input-error' : undefined}
            />
            {error && (
              <small id="sid-dialog-input-error" className="sid-form-field-error" role="alert">
                {error}
              </small>
            )}
          </div>
        )}

        <div className="sid-notice-actions">
          {dialog.kind !== 'alert' && (
            <button
              type="button"
              className="sid-notice-cancel"
              onClick={() => resolveDialog(cancelValue)}
            >
              {dialog.cancelLabel}
            </button>
          )}
          <button
            ref={primaryButton}
            type="submit"
            className={`sid-operator-primary ${tone === 'danger' ? 'sid-notice-danger' : ''}`}
          >
            {dialog.kind === 'alert' ? dialog.closeLabel : dialog.confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}

// Daftar perubahan per kelompok (mis. per warga): Data, Lama, Baru.
function ChangeDetails({ groups }: { groups: DialogChangeGroup[] }) {
  return (
    <div className="sid-dialog-changes">
      {groups.map((group) => (
        <section key={group.title} className="sid-dialog-change" aria-label={group.title}>
          <h3>{group.title}</h3>
          {group.rows.length === 0 ? (
            <p>Tidak ada data yang berubah.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  {group.showOld !== false && <th scope="col">Lama</th>}
                  <th scope="col">Baru</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    {group.showOld !== false && <td>{row.from}</td>}
                    <td>{row.to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </div>
  )
}
