import { useEffect, useState } from 'react'
import { applyFulfillment, getFulfillmentProposal } from '../api/letterExtrasApi'
import { confirmDialog } from '@/shared/lib/dialog'
import { SemiManualFulfillmentForm } from './SemiManualFulfillmentForm'

const ACTION_TITLES = {
  update_citizen: 'Perubahan Data Warga',
  create_citizen: 'Penambahan Data Warga',
  deactivate_members: 'Penonaktifan Anggota Keluarga',
  manual: 'Pembaruan Data Penduduk & KK',
}

function serverMessage(error, fallback) {
  const errors = error?.response?.data?.errors

  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat()[0]

    if (first) return first
  }

  return error?.response?.data?.message ?? fallback
}

function display(value) {
  if (value === true) return 'Ya'
  if (value === false) return 'Tidak'

  return value === null || value === undefined || value === '' ? '-' : String(value)
}

/**
 * "Terapkan": Kasi/Kaur yang ditugaskan (atau Petugas Desa sebagai
 * cadangan) meninjau nilai yang diusulkan warga, boleh mengoreksinya, lalu
 * menerapkannya ke data kependudukan. Hanya kolom yang ditetapkan untuk
 * jenis surat itu yang tampil.
 */
export function FulfillmentPanel({ letterId, onApplied }) {
  const [proposal, setProposal] = useState(null)
  const [values, setValues] = useState({})
  const [subjectNik, setSubjectNik] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true

    getFulfillmentProposal(letterId)
      .then((data) => {
        if (!active) return

        setProposal(data)
        setSubjectNik(data?.subject?.nik ?? '')
        setValues(
          Object.fromEntries(
            (data?.fields ?? [])
              .filter((field) => !field.fixed)
              .map((field) => [field.column, field.proposed ?? '']),
          ),
        )
      })
      .catch((requestError) => {
        if (active) setError(serverMessage(requestError, 'Gagal memuat usulan perubahan data.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [letterId])

  const handleApply = async (event) => {
    event.preventDefault()

    const confirmed = await confirmDialog({
      title: 'Terapkan perubahan ke data kependudukan?',
      message: `Data warga${
        proposal?.subject && subjectNik.trim() ? ` ber-NIK ${subjectNik.trim()}` : ''
      } akan diperbarui sesuai nilai di tabel. Perubahan hanya dapat diterapkan sekali.`,
      confirmLabel: 'Terapkan',
      tone: 'primary',
    })

    if (!confirmed) return

    setSaving(true)
    setError('')

    // Kolom yang dikosongkan tidak dikirim: nilainya tidak diubah.
    const filled = Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== '' && value !== null),
    )

    try {
      const response = await applyFulfillment(
        letterId,
        filled,
        proposal?.subject ? subjectNik.trim() : null,
      )

      setMessage(response?.message ?? 'Perubahan data berhasil diterapkan.')
      setProposal((current) => ({ ...current, fulfilled_at: new Date().toISOString() }))
      onApplied?.(response?.data)
    } catch (requestError) {
      setError(serverMessage(requestError, 'Gagal menerapkan perubahan data.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="sid-modal-note-text">Memuat usulan perubahan data...</p>
  }

  if (!proposal) {
    return error ? (
      <p role="alert" className="sid-warning-box">
        {error}
      </p>
    ) : null
  }

  const done = Boolean(proposal.fulfilled_at)
  const isCreate = proposal.action === 'create_citizen'
  const isSemiManual = ['deactivate_members', 'manual'].includes(proposal.action)

  const handleSemiManualDone = (response) => {
    setMessage(response?.message ?? 'Perubahan data berhasil disimpan.')
    setProposal((current) => ({ ...current, fulfilled_at: new Date().toISOString() }))
    onApplied?.(response?.data)
  }

  return (
    <section className="sid-modal-note" aria-label="Terapkan perubahan data">
      <p className="sid-modal-note-label">{ACTION_TITLES[proposal.action] ?? 'Perubahan Data'}</p>

      {message && (
        <p role="status" className="sid-admin-alert sid-admin-alert-success">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="sid-warning-box">
          {error}
        </p>
      )}

      {done ? (
        <p className="sid-modal-note-text">
          Sudah {proposal.action === 'manual' ? 'ditandai selesai' : 'diterapkan'} pada{' '}
          {new Date(proposal.fulfilled_at).toLocaleString('id-ID')}.
        </p>
      ) : isSemiManual ? (
        <SemiManualFulfillmentForm
          letterId={letterId}
          proposal={proposal}
          onDone={handleSemiManualDone}
        />
      ) : (
        <form onSubmit={handleApply}>
          <p className="sid-modal-note-text">
            Tinjau nilai yang diusulkan warga. Anda boleh mengoreksinya sebelum diterapkan. Kolom
            yang dikosongkan tidak diubah.
          </p>

          {proposal.subject && (
            <div className="sid-form-group">
              <label className="sid-label" htmlFor={`subject-nik-${letterId}`}>
                NIK warga yang datanya diubah
              </label>
              <input
                id={`subject-nik-${letterId}`}
                className="sid-input"
                inputMode="numeric"
                maxLength={16}
                value={subjectNik}
                onChange={(event) => setSubjectNik(event.target.value)}
                placeholder="16 digit NIK"
              />
              <p className="sid-modal-note-text">
                {proposal.subject.found && subjectNik === (proposal.subject.nik ?? '')
                  ? `Ditemukan di data warga: ${proposal.subject.name}.`
                  : 'Subjek surat ini bukan pemohon. Isi atau periksa NIK-nya; data warga dengan NIK itulah yang diubah.'}
              </p>
            </div>
          )}

          <div className="sid-operator-table-wrapper">
            <table className="sid-operator-table">
              <thead>
                <tr>
                  <th>Data</th>
                  {!isCreate && <th>Nilai Sekarang</th>}
                  <th>Usulan Warga</th>
                  <th>Nilai Diterapkan</th>
                </tr>
              </thead>
              <tbody>
                {proposal.fields.map((field) => (
                  <tr key={field.column}>
                    <td>{field.label}</td>
                    {!isCreate && <td>{display(field.current)}</td>}
                    <td>{field.fixed ? '-' : display(field.proposed)}</td>
                    <td>
                      {field.fixed ? (
                        // Nilai tetap dari jenis surat; tidak dapat dikoreksi.
                        <strong>{field.display ?? display(field.proposed)}</strong>
                      ) : (
                        <input
                          className="sid-input"
                          aria-label={`Nilai diterapkan untuk ${field.label}`}
                          value={values[field.column] ?? ''}
                          onChange={(event) =>
                            setValues((current) => ({
                              ...current,
                              [field.column]: event.target.value,
                            }))
                          }
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="submit" disabled={saving} className="sid-primary-button">
            {saving ? 'Menerapkan...' : 'Terapkan'}
          </button>
        </form>
      )}
    </section>
  )
}
