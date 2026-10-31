/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { AxiosResponse } from 'axios'
import type { LetterType, ResourceResponse } from '@/types'
import { apiErrorBody, getApiErrorMessage } from '@/shared/lib/apiError'
import { Power, Save } from 'lucide-react'

import { getLetterTypes, updateLetterType } from '../api/letterTypeApi'
import { describeLetterTypeOutput } from '../utils/letterTypeConfig'
import { StatusPill } from '@/components/ui/StatusPill'
import type { StatusTone } from '@/components/ui/StatusPill'
import { confirmDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'

// Kategori menentukan kelompok di pilihan pengajuan dan petugasnya
// (diatur backend: Persuratan Desa -> Kaur, Layanan Kependudukan -> Kasi).
const CATEGORY_OPTIONS = [
  ['persuratan', 'Persuratan Desa', 'Kaur TU & Umum'],
  ['pelayanan', 'Layanan Kependudukan', 'Kasi Pemerintahan'],
]

const STATUS_BADGES: Record<string, [string, StatusTone]> = {
  aktif: ['Aktif', 'active'],
  dinonaktifkan: ['Nonaktif', 'inactive'],
  draft: ['Draft', 'warning'],
}

// Isian per jenis surat sebelum disimpan; masa berlaku kosong = ''.
type LetterTypeDraft = { validity_days: number | string; category: string }

function getResponseData(response: AxiosResponse<ResourceResponse<LetterType>>) {
  return response?.data?.data
}

// Semua pesan validasi digabung; selain itu pesan dari backend.
function getRequestErrorMessage(requestError: unknown, fallback: string) {
  const validationErrors = apiErrorBody(requestError)?.errors
  const validationMessage = validationErrors
    ? Object.values(validationErrors).flat().filter(Boolean).join(' ')
    : ''

  return validationMessage || apiErrorBody(requestError)?.message || fallback
}

// reloadKey: dinaikkan halaman induk (tombol Refresh) untuk memuat ulang
// daftar; isian yang belum disimpan ikut kembali ke data server.
export default function LetterTypeSettingsPanel({ reloadKey = 0 }: { reloadKey?: number }) {
  const [letterTypes, setLetterTypes] = useState<LetterType[]>([])
  const [drafts, setDrafts] = useState<Record<number, LetterTypeDraft>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
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
              category: type.category ?? 'persuratan',
            },
          ]),
        ),
      )
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal memuat konfigurasi jenis surat.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLetterTypes()
  }, [loadLetterTypes, reloadKey])

  const updateDraft = (id: number, field: keyof LetterTypeDraft, value: string) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }))
  }

  const saveLetterType = async (event: FormEvent<HTMLFormElement>, letterType: LetterType) => {
    event.preventDefault()
    const draft = drafts[letterType.id]
    setSavingId(letterType.id)
    setError('')

    try {
      const response = await updateLetterType(letterType.id, {
        validity_days: draft.validity_days === '' ? null : Number(draft.validity_days),
        category: draft.category,
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

  const toggleLetterType = async (letterType: LetterType) => {
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
              <th>Kategori</th>
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
                        aria-label={`Kategori ${letterType.name}`}
                        form={`letter-type-${letterType.id}`}
                        value={drafts[letterType.id]?.category ?? 'persuratan'}
                        onChange={(event) =>
                          updateDraft(letterType.id, 'category', event.target.value)
                        }
                      >
                        {CATEGORY_OPTIONS.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <small className="sid-admin-cell-meta">
                        Petugas:{' '}
                        {CATEGORY_OPTIONS.find(
                          ([value]) => value === drafts[letterType.id]?.category,
                        )?.[2] ?? '-'}
                      </small>
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
