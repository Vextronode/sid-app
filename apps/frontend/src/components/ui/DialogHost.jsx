import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Info, PenLine, Trash2, XCircle } from 'lucide-react'

import { currentDialog, resolveDialog, subscribeDialogs } from '@/shared/lib/dialog'

const ICONS = {
  error: XCircle,
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info,
  danger: Trash2,
  primary: PenLine,
}

// Kartu dialog di tengah layar untuk alertDialog/confirmDialog/promptDialog.
// Dipasang sekali di main.jsx.
export function DialogHost() {
  const dialog = useSyncExternalStore(subscribeDialogs, currentDialog)

  if (!dialog) return null

  return createPortal(<DialogCard key={dialog.id} dialog={dialog} />, document.body)
}

function DialogCard({ dialog }) {
  const { kind, title, message, tone } = dialog
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const primaryButton = useRef(null)
  const input = useRef(null)

  const cancelValue = kind === 'confirm' ? false : kind === 'prompt' ? null : undefined
  const Icon = ICONS[tone] ?? Info

  useEffect(() => {
    ;(kind === 'prompt' ? input : primaryButton).current?.focus()

    const handleKey = (event) => {
      if (event.key !== 'Escape') return
      // Escape ini milik dialog; jangan sampai ikut menutup form di bawahnya.
      event.stopImmediatePropagation()
      resolveDialog(cancelValue)
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [kind, cancelValue])

  const submit = (event) => {
    event.preventDefault()

    if (kind === 'confirm') return resolveDialog(true)
    if (kind === 'alert') return resolveDialog(undefined)

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

        {kind === 'prompt' && (
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
          {kind !== 'alert' && (
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
            {kind === 'alert' ? dialog.closeLabel : dialog.confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
