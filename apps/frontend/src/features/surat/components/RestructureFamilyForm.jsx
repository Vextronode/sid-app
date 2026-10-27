import { useState } from 'react'

import { applyFulfillment } from '../api/letterExtrasApi'
import { confirmFulfillment } from '../utils/confirmFulfillment'

function serverMessage(error, fallback) {
  const errors = error?.response?.data?.errors

  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat()[0]

    if (first) return first
  }

  return error?.response?.data?.message ?? fallback
}

/**
 * Terapkan perubahan susunan KK (F09, aksi `restructure_family`): ringkasan
 * rencana dari server, No. KK baru bila membentuk KK baru, lalu pop up daftar
 * perubahan per warga untuk dikonfirmasi.
 */
export function RestructureFamilyForm({ letterId, proposal, onDone }) {
  const needsNumber = (proposal.fields ?? []).some((field) => field.column === 'no_kk')
  const [number, setNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    const values = needsNumber ? { no_kk: number.trim() } : {}

    try {
      if (await confirmFulfillment(letterId, values, null)) {
        onDone(await applyFulfillment(letterId, values, null))
      }
    } catch (requestError) {
      setError(serverMessage(requestError, 'Gagal menerapkan perubahan susunan KK.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <ul className="sid-modal-note-text">
        {(proposal.restructure?.lines ?? []).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      {needsNumber && (
        <div className="sid-form-group">
          <label className="sid-label" htmlFor={`new-kk-${letterId}`}>
            No. KK Baru (dari KK terbitan Disdukcapil)
          </label>
          <input
            id={`new-kk-${letterId}`}
            className="sid-input"
            inputMode="numeric"
            maxLength={16}
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            placeholder="16 digit No. KK"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="sid-warning-box">
          {error}
        </p>
      )}

      <button type="submit" className="sid-primary-button" disabled={saving}>
        {saving ? 'Menerapkan...' : 'Terapkan'}
      </button>
    </form>
  )
}
