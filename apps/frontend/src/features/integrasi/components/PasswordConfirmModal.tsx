import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { getApiErrorMessage } from '@/shared/lib/apiError'

type PasswordConfirmModalProps = {
  title: string
  message: ReactNode
  confirmLabel: string
  danger?: boolean
  // Ditolak (throw) bila gagal; pesan galat backend ditampilkan di modal.
  onConfirm: (password: string) => Promise<void>
  onClose: () => void
}

/**
 * Konfirmasi kata sandi akun sebelum aksi token integrasi, agar tidak bisa
 * dilakukan dari sesi yang tertinggal terbuka.
 */
export function PasswordConfirmModal({
  title,
  message,
  confirmLabel,
  danger = false,
  onConfirm,
  onClose,
}: PasswordConfirmModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    input.current?.focus()
  }, [])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose()
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, submitting])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!password) {
      setError('Masukkan kata sandi Anda untuk melanjutkan.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await onConfirm(password)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Aksi gagal diproses.'))
      setSubmitting(false)
    }
  }

  return (
    <div className="sid-modal-overlay">
      <form
        className="sid-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="integration-password-title"
        onSubmit={submit}
      >
        <h2 id="integration-password-title">{title}</h2>
        <div>{message}</div>

        <label className="sid-form-group">
          <span className="sid-form-label">Kata sandi Anda</span>
          <input
            ref={input}
            className="sid-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setError('')
            }}
            aria-invalid={Boolean(error)}
          />
        </label>

        {error && (
          <p className="sid-admin-alert sid-admin-alert-error" role="alert">
            {error}
          </p>
        )}

        <div className="sid-modal-actions">
          <button
            type="button"
            className="sid-button sid-button-outline"
            disabled={submitting}
            onClick={onClose}
          >
            Batal
          </button>
          <button
            type="submit"
            className={danger ? 'sid-btn sid-btn-danger' : 'sid-button sid-button-primary'}
            disabled={submitting}
          >
            {submitting ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
