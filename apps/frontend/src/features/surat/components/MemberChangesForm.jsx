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

// Nilai awal pilihan per anggota: usulan warga (kosong bila harus dipilih).
function initialValues(memberChanges) {
  return Object.fromEntries(
    memberChanges.map((member) => [
      member.index,
      Object.fromEntries(
        member.fields.map((field) => [
          field.column,
          field.proposed == null ? '' : String(field.proposed),
        ]),
      ),
    ]),
  )
}

/**
 * Terapkan perubahan elemen data beberapa anggota KK sekaligus (aksi
 * `update_members`). Tiap kolom boleh dikoreksi; pekerjaan "Lainnya" yang
 * belum ada di katalog wajib dipilih dari katalog agar ikut diterapkan.
 */
export function MemberChangesForm({ letterId, proposal, onDone }) {
  const memberChanges = proposal.member_changes ?? []
  const [values, setValues] = useState(() => initialValues(memberChanges))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setValue = (index, column, value) =>
    setValues((current) => ({ ...current, [index]: { ...current[index], [column]: value } }))

  const unresolved = memberChanges.flatMap((member) =>
    member.fields.filter((field) => field.needs_choice && !values[member.index]?.[field.column]),
  )

  const handleSubmit = async (event) => {
    event.preventDefault()

    setSaving(true)
    setError('')

    // Kolom kosong tidak dikirim: backend memakai usulan atau melewatinya.
    const filled = Object.fromEntries(
      Object.entries(values).map(([index, columns]) => [
        index,
        Object.fromEntries(Object.entries(columns).filter(([, value]) => value !== '')),
      ]),
    )

    try {
      // Pop up daftar perubahan (lama -> baru) sebelum disimpan.
      if (await confirmFulfillment(letterId, filled, null)) {
        onDone(await applyFulfillment(letterId, filled, null))
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
        Tinjau perubahan tiap anggota berdasarkan KK terbaru. Anda boleh mengoreksi nilai sebelum
        diterapkan.
      </p>

      {memberChanges.map((member) => (
        <div key={member.index} className="sid-member-change">
          <p className="sid-member-change-name">
            {member.index + 1}. {member.name}
            {!member.found && <span className="sid-form-field-error"> (tidak ditemukan)</span>}
          </p>

          <div className="sid-operator-table-wrapper">
            <table className="sid-operator-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Sekarang</th>
                  <th>Usulan</th>
                  <th>Diterapkan</th>
                </tr>
              </thead>
              <tbody>
                {member.fields.map((field) => (
                  <tr key={field.column}>
                    <td>{field.label}</td>
                    <td>{field.current_label}</td>
                    <td>
                      {field.proposed_label}
                      {field.needs_choice && (
                        <span className="sid-form-field-error"> (belum ada di katalog)</span>
                      )}
                    </td>
                    <td>
                      <select
                        className="sid-select"
                        aria-label={`${field.label} ${member.name}`}
                        value={values[member.index]?.[field.column] ?? ''}
                        onChange={(event) =>
                          setValue(member.index, field.column, event.target.value)
                        }
                      >
                        <option value="">
                          {field.needs_choice ? 'Pilih dari katalog...' : 'Tidak diubah'}
                        </option>
                        {(proposal.options?.[field.column] ?? []).map((option) => (
                          <option key={option.value} value={String(option.value)}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {unresolved.length > 0 && (
        <p className="sid-warning-box" role="status">
          {unresolved.length} kolom pekerjaan belum dipilih dari katalog dan tidak akan diubah.
        </p>
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
