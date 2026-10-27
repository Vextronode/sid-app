import { useEffect, useRef, useState } from 'react'
import { applyFulfillment, getFulfillmentProposal } from '../api/letterExtrasApi'
import { confirmFulfillment } from '../utils/confirmFulfillment'
import { SemiManualFulfillmentForm } from './SemiManualFulfillmentForm'
import { MemberChangesForm } from './MemberChangesForm'
import { UpdateCitizensForm } from './UpdateCitizensForm'
import { RestructureFamilyForm } from './RestructureFamilyForm'

const ACTION_TITLES = {
  update_citizen: 'Perubahan Data Warga',
  create_citizen: 'Penambahan Data Warga',
  deactivate_members: 'Penonaktifan Anggota Keluarga',
  update_members: 'Perubahan Data Anggota Keluarga',
  update_citizens: 'Perubahan Data Warga',
  restructure_family: 'Perubahan Susunan KK',
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
 * "Terapkan": Kasi/Kaur yang ditugaskan (atau Staf SIDUTama sebagai
 * cadangan) meninjau nilai yang diusulkan warga, boleh mengoreksinya, lalu
 * menerapkannya ke data kependudukan. Hanya kolom yang ditetapkan untuk
 * jenis surat itu yang tampil. Sebelum disimpan, pop up menampilkan daftar
 * perubahan (lama -> baru) dari server untuk dikonfirmasi.
 *
 * `autoStart` (hasil instansi baru diterima): Terapkan langsung dimulai bila
 * tidak ada isian wajib yang masih kosong (mis. NIK atau No. KK baru dari
 * dokumen terbitan); bila ada, Kasi/Kaur diminta melengkapinya dulu.
 */
export function FulfillmentPanel({ letterId, onApplied, autoStart = false }) {
  const [proposal, setProposal] = useState(null)
  const [values, setValues] = useState({})
  const [subjectNik, setSubjectNik] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [needsInput, setNeedsInput] = useState(false)
  const section = useRef(null)
  const autoStarted = useRef(false)

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

    setSaving(true)
    setError('')

    // Kolom yang dikosongkan tidak dikirim: nilainya tidak diubah.
    const filled = Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== '' && value !== null),
    )
    const nik = proposal?.subject ? subjectNik.trim() : null

    try {
      if (!(await confirmFulfillment(letterId, filled, nik))) return

      const response = await applyFulfillment(letterId, filled, nik)

      setMessage(response?.message ?? 'Perubahan data berhasil diterapkan.')
      setProposal((current) => ({ ...current, fulfilled_at: new Date().toISOString() }))
      onApplied?.(response?.data)
    } catch (requestError) {
      setError(serverMessage(requestError, 'Gagal menerapkan perubahan data.'))
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!autoStart || autoStarted.current || loading || !proposal || proposal.fulfilled_at) return
    // "Tandai selesai" (manual) tetap dikonfirmasi sendiri oleh Kasi/Kaur.
    if (proposal.action === 'manual') return

    autoStarted.current = true

    // Isian dari dokumen terbitan yang belum diisi: NIK warga baru, No. KK baru.
    const missing =
      ['create_citizen', 'restructure_family'].includes(proposal.action) &&
      (proposal.fields ?? []).some(
        (field) => ['nik', 'no_kk'].includes(field.column) && !String(values[field.column] ?? ''),
      )

    if (missing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNeedsInput(true)

      return
    }

    const form = section.current?.querySelector('form')
    const submit = form?.querySelector('button[type="submit"]')

    if (form && !submit?.disabled) form.requestSubmit()
  }, [autoStart, loading, proposal, values])

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
    <section ref={section} className="sid-modal-note" aria-label="Terapkan perubahan data">
      <p className="sid-modal-note-label">{ACTION_TITLES[proposal.action] ?? 'Perubahan Data'}</p>

      {needsInput && !done && (
        <p role="status" className="sid-warning-box">
          Hasil sudah diterima. Isi NIK/No. KK dari dokumen terbitan Disdukcapil di bawah, lalu klik
          Terapkan.
        </p>
      )}

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
      ) : proposal.action === 'update_members' ? (
        <MemberChangesForm letterId={letterId} proposal={proposal} onDone={handleSemiManualDone} />
      ) : proposal.action === 'restructure_family' ? (
        <RestructureFamilyForm
          letterId={letterId}
          proposal={proposal}
          onDone={handleSemiManualDone}
        />
      ) : proposal.action === 'update_citizens' ? (
        <UpdateCitizensForm letterId={letterId} proposal={proposal} onDone={handleSemiManualDone} />
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

          {proposal.family && <p className="sid-modal-note-text">{proposal.family.description}</p>}

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
                    <td>{field.fixed ? '-' : (field.proposed_label ?? display(field.proposed))}</td>
                    <td>
                      {field.fixed ? (
                        // Nilai tetap dari jenis surat; tidak dapat dikoreksi.
                        <strong>{field.display ?? display(field.proposed)}</strong>
                      ) : field.options ? (
                        // Kolom berkode (jenis kelamin, RT, agama, ...): pilihan berlabel.
                        <select
                          className="sid-select"
                          aria-label={`Nilai diterapkan untuk ${field.label}`}
                          value={String(values[field.column] ?? '')}
                          onChange={(event) =>
                            setValues((current) => ({
                              ...current,
                              [field.column]: event.target.value,
                            }))
                          }
                        >
                          <option value="">Tidak diubah</option>
                          {field.options.map((option) => (
                            <option key={option.value} value={String(option.value)}>
                              {option.label}
                            </option>
                          ))}
                        </select>
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
