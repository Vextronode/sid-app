/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { Save } from 'lucide-react'

import { getLetterTypes, updateLetterType } from '../api/letterTypeApi'

const ASSIGNED_ROLE_OPTIONS = [
  ['', 'Tidak ditentukan'],
  ['kasi_pelayanan', 'Kasi Pelayanan'],
  ['kaur_tu_umum', 'Kaur TU Umum'],
]

function getResponseData(response) {
  return response?.data?.data
}

export default function LetterTypeSettingsPanel() {
  const [letterTypes, setLetterTypes] = useState([])
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadLetterTypes = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const types = await getLetterTypes()
      const activeTypes = Array.isArray(types) ? types : []
      setLetterTypes(activeTypes)
      setDrafts(
        Object.fromEntries(
          activeTypes.map((type) => [
            type.id,
            {
              validity_days: type.validity_days ?? '',
              assigned_role: type.assigned_role ?? '',
            },
          ]),
        ),
      )
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Gagal memuat konfigurasi jenis surat.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLetterTypes()
  }, [loadLetterTypes])

  const updateDraft = (id, field, value) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }))
  }

  const saveLetterType = async (event, letterType) => {
    event.preventDefault()
    const draft = drafts[letterType.id]
    setSavingId(letterType.id)
    setError('')
    setMessage('')

    try {
      const response = await updateLetterType(letterType.id, {
        validity_days: draft.validity_days === '' ? null : Number(draft.validity_days),
        assigned_role: draft.assigned_role || null,
      })
      const updatedType = getResponseData(response)
      setLetterTypes((current) =>
        current.map((type) => (type.id === letterType.id ? { ...type, ...updatedType } : type)),
      )
      setMessage(`Konfigurasi ${letterType.name} berhasil disimpan.`)
    } catch (requestError) {
      const validationErrors = requestError?.response?.data?.errors
      const validationMessage = validationErrors
        ? Object.values(validationErrors).flat().filter(Boolean).join(' ')
        : ''
      setError(
        validationMessage ||
          requestError?.response?.data?.message ||
          'Gagal menyimpan konfigurasi jenis surat.',
      )
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section className="sid-admin-letter-types-panel" aria-labelledby="letter-types-heading">
      <header>
        <div>
          <h2 id="letter-types-heading">Konfigurasi Jenis Surat</h2>
          <p>Nama, kategori, dan jenis surat mengikuti data dari backend.</p>
        </div>
      </header>

      {error && (
        <p className="sid-admin-alert sid-admin-alert-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="sid-admin-alert sid-admin-alert-success" role="status">
          {message}
        </p>
      )}

      <div className="sid-operator-table-wrapper">
        <table className="sid-operator-table">
          <thead>
            <tr>
              <th>Jenis Surat</th>
              <th>Kategori</th>
              <th>Masa Berlaku (hari)</th>
              <th>Petugas</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="empty">
                  Memuat jenis surat...
                </td>
              </tr>
            ) : letterTypes.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty">
                  Belum ada jenis surat aktif.
                </td>
              </tr>
            ) : (
              letterTypes.map((letterType) => (
                <tr key={letterType.id}>
                  <td>
                    <strong>{letterType.name}</strong>
                    <small className="sid-admin-cell-meta">{letterType.code}</small>
                  </td>
                  <td>{letterType.category?.name ?? '-'}</td>
                  <td>
                    <form
                      id={`letter-type-${letterType.id}`}
                      onSubmit={(event) => saveLetterType(event, letterType)}
                      className="sid-admin-letter-type-edit"
                    >
                      <input
                        aria-label={`Masa berlaku ${letterType.name}`}
                        type="number"
                        min="1"
                        value={drafts[letterType.id]?.validity_days ?? ''}
                        onChange={(event) =>
                          updateDraft(letterType.id, 'validity_days', event.target.value)
                        }
                      />
                    </form>
                  </td>
                  <td>
                    <select
                      aria-label={`Petugas ${letterType.name}`}
                      form={`letter-type-${letterType.id}`}
                      value={drafts[letterType.id]?.assigned_role ?? ''}
                      onChange={(event) =>
                        updateDraft(letterType.id, 'assigned_role', event.target.value)
                      }
                    >
                      {ASSIGNED_ROLE_OPTIONS.map(([value, label]) => (
                        <option key={value || 'none'} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="submit"
                      form={`letter-type-${letterType.id}`}
                      className="sid-operator-primary"
                      disabled={savingId !== null}
                    >
                      <Save size={16} />
                      {savingId === letterType.id ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
