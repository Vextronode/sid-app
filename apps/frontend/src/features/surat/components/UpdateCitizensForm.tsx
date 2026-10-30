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
 * Terapkan perubahan data beberapa warga yang NIK-nya diisi di form (aksi
 * `update_citizens`, mis. status kawin suami dan istri). Warga yang tidak
 * terdata di desa dilewati.
 */
export function UpdateCitizensForm({ letterId, proposal, onDone }) {
  const subjects = proposal.subjects ?? []
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const found = subjects.filter((subject) => subject.found)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (await confirmFulfillment(letterId, {}, null)) {
        onDone(await applyFulfillment(letterId, {}, null))
      }
    } catch (requestError) {
      setError(serverMessage(requestError, 'Gagal menerapkan perubahan data.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="sid-modal-note-text">
        Data warga berikut diperbarui sesuai surat. Yang tidak terdata di desa ini dilewati.
      </p>

      {subjects.map((subject) => (
        <div key={subject.label} className="sid-member-change">
          <p className="sid-member-change-name">
            {subject.label}: {subject.found ? subject.name : 'tidak terdata di desa'}
            {subject.nik_masked ? ` (NIK ${subject.nik_masked})` : ''}
          </p>
          {subject.found && (
            <ul className="sid-modal-note-text">
              {subject.fields.map((field) => (
                <li key={field.label}>
                  {field.label}: {field.current_label} - {field.proposed_label}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {error && (
        <p role="alert" className="sid-warning-box">
          {error}
        </p>
      )}

      <button type="submit" className="sid-primary-button" disabled={saving || found.length === 0}>
        {saving ? 'Menerapkan...' : 'Terapkan'}
      </button>
    </form>
  )
}
