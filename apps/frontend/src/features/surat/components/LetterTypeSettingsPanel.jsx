/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { Power, Save } from 'lucide-react'

import { getLetterTypes, updateLetterType } from '../api/letterTypeApi'
import { describeLetterTypeOutput } from '../utils/letterTypeConfig'
import { StatusPill } from '@/components/ui/StatusPill'
import { confirmDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'

const ASSIGNED_ROLE_OPTIONS = [
  ['', 'Tidak ditentukan'],
  ['kasi_pelayanan', 'Kasi Pelayanan'],
  ['kaur_tu_umum', 'Kaur TU Umum'],
]

const STATUS_BADGES = {
  aktif: ['Aktif', 'active'],
  dinonaktifkan: ['Nonaktif', 'inactive'],
  draft: ['Draft', 'warning'],
}

function getResponseData(response) {
  return response?.data?.data
}

function getRequestErrorMessage(requestError, fallback) {
  const validationErrors = requestError?.response?.data?.errors
  const validationMessage = validationErrors
    ? Object.values(validationErrors).flat().filter(Boolean).join(' ')
    : ''

  return validationMessage || requestError?.response?.data?.message || fallback
}

export default function LetterTypeSettingsPanel() {
  const [letterTypes, setLetterTypes] = useState([])
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [error, setError] = useState('')

  const loadLetterTypes = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const types = await getLetterTypes({ includeInactive: true })
      const allTypes = Array.isArray(types) ? types : []
      setLetterTypes(allTypes)
      setDrafts(
        Object.fromEntries(
          allTypes.map((type) => [
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

    try {
      const response = await updateLetterType(letterType.id, {
        validity_days: draft.validity_days === '' ? null : Number(draft.validity_days),
        assigned_role: draft.assigned_role || null,
      })
      const updatedType = getResponseData(response)
      setLetterTypes((current) =>
        current.map((type) => (type.id === letterType.id ? { ...type, ...updatedType } : type)),
      )
      notifySuccess(`Konfigurasi ${letterType.name} berhasil disimpan.`)
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Gagal menyimpan konfigurasi jenis surat.'))
    } finally {
      setSavingId(null)
    }
  }

  const toggleLetterType = async (letterType) => {
    const nextActive = !letterType.is_active
    const confirmed = await confirmDialog(
      nextActive
        ? {
            title: `Aktifkan ${letterType.name}?`,
            message: 'Jenis surat ini akan tersedia untuk diajukan warga.',
            confirmLabel: 'Aktifkan',
            tone: 'primary',
          }
        : {
            title: `Nonaktifkan ${letterType.name}?`,
            message: 'Warga tidak dapat lagi mengajukan jenis surat ini.',
            confirmLabel: 'Nonaktifkan',
          },
    )

    if (!confirmed) return

    setTogglingId(letterType.id)
    setError('')

    try {
      const response = await updateLetterType(letterType.id, { is_active: nextActive })
      const updatedType = getResponseData(response)
      setLetterTypes((current) =>
        current.map((type) => (type.id === letterType.id ? { ...type, ...updatedType } : type)),
      )
      notifySuccess(`${letterType.name} berhasil ${nextActive ? 'diaktifkan' : 'dinonaktifkan'}.`)
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Gagal mengubah status jenis surat.'))
    } finally {
      setTogglingId(null)
    }
  }

  const busy = savingId !== null || togglingId !== null

  return (
    <section className="sid-admin-letter-types-panel" aria-labelledby="letter-types-heading">
      <header>
        <div>
          <h2 id="letter-types-heading">Konfigurasi Jenis Surat</h2>
          <p>Nama, isian form, dan keluaran jenis surat ditetapkan developer.</p>
        </div>
      </header>

      {error && (
        <p className="sid-admin-alert sid-admin-alert-error" role="alert">
          {error}
        </p>
      )}

      <div className="sid-operator-table-wrapper">
        <table className="sid-operator-table">
          <thead>
            <tr>
              <th>Jenis Surat</th>
              <th>Status</th>
              <th>Keluaran</th>
              <th>Masa Berlaku (hari)</th>
              <th>Petugas</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="empty">
                  Memuat jenis surat...
                </td>
              </tr>
            ) : letterTypes.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty">
                  Belum ada jenis surat.
                </td>
              </tr>
            ) : (
              letterTypes.map((letterType) => {
                const [statusText, statusTone] =
                  STATUS_BADGES[letterType.status_label] ?? STATUS_BADGES.draft
                const isDraft = letterType.status_label === 'draft'

                return (
                  <tr key={letterType.id}>
                    <td>
                      <strong>{letterType.name}</strong>
                      <small className="sid-admin-cell-meta">{letterType.code}</small>
                    </td>
                    <td>
                      <StatusPill tone={statusTone}>{statusText}</StatusPill>
                    </td>
                    <td>{describeLetterTypeOutput(letterType)}</td>
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
                      <div className="sid-admin-letter-type-actions">
                        <button
                          type="submit"
                          form={`letter-type-${letterType.id}`}
                          className="sid-operator-primary"
                          disabled={busy}
                        >
                          <Save size={16} />
                          {savingId === letterType.id ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <button
                          type="button"
                          className="sid-operator-secondary"
                          onClick={() => toggleLetterType(letterType)}
                          disabled={busy || isDraft}
                          title={isDraft ? 'Jenis surat draft belum memiliki template.' : undefined}
                        >
                          <Power size={16} />
                          {togglingId === letterType.id
                            ? 'Memproses...'
                            : letterType.is_active
                              ? 'Nonaktifkan'
                              : 'Aktifkan'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
