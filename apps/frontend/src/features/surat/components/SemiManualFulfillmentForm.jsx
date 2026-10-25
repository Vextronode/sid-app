import { useState } from 'react'
import { Link } from 'react-router-dom'

import { applyFulfillment } from '../api/letterExtrasApi'
import { confirmDialog } from '@/shared/lib/dialog'

// Data Penduduk dan pengelolaan KK ada di halaman yang sama.
const POPULATION_PAGE = '/admin/data-warga'

function serverMessage(error, fallback) {
  const errors = error?.response?.data?.errors

  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat()[0]

    if (first) return first
  }

  return error?.response?.data?.message ?? fallback
}

/**
 * Aksi data semi-manual:
 * - `deactivate_members`: menonaktifkan anggota KK yang dipilih pemohon;
 *   tanpa anggota terpilih (mis. orang asing di Pindah Keluar) cukup
 *   ditandai selesai;
 * - `manual`: Kasi/Kaur mengerjakan perubahan sendiri di Data Penduduk/KK
 *   (berdasarkan hasil dari instansi), lalu menekan "Tandai selesai".
 */
export function SemiManualFulfillmentForm({ letterId, proposal, onDone }) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const members = proposal.members ?? []
  // Tanpa anggota terdata, penonaktifan cukup ditandai selesai.
  const isManual = proposal.action === 'manual' || members.length === 0
  const activeMembers = members.filter((member) => member.found && member.is_active)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const confirmed = await confirmDialog(
      isManual
        ? {
            title: 'Tandai perubahan data selesai?',
            message:
              'Pastikan data penduduk dan KK sudah diperbarui sesuai hasil dari instansi. Tindakan ini hanya dapat dilakukan sekali.',
            confirmLabel: 'Tandai selesai',
            tone: 'primary',
          }
        : {
            title: 'Nonaktifkan anggota keluarga?',
            message: `${activeMembers.length} data warga beserta akun login-nya akan dinonaktifkan. Tindakan ini hanya dapat dilakukan sekali.`,
            confirmLabel: 'Nonaktifkan',
            tone: 'danger',
          },
    )

    if (!confirmed) return

    setSaving(true)
    setError('')

    try {
      const response = await applyFulfillment(letterId, {}, null, notes.trim())
      onDone(response)
    } catch (requestError) {
      setError(serverMessage(requestError, 'Gagal menyimpan perubahan data.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {proposal.instructions && <p className="sid-modal-note-text">{proposal.instructions}</p>}

      {isManual ? (
        <>
          <p className="sid-modal-note-text">
            Perubahan dikerjakan langsung di{' '}
            <Link to={POPULATION_PAGE}>Data Penduduk &amp; KK</Link>, lalu tandai selesai di sini.
          </p>
          <textarea
            className="sid-textarea"
            aria-label="Catatan perubahan data"
            placeholder="Catatan (opsional), mis. KK baru sudah diinput"
            maxLength={500}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </>
      ) : (
        <ul className="sid-modal-note-text">
          {members.map((member) => (
            <li key={member.citizen_id ?? member.name}>
              <strong>{member.name}</strong> ({member.family_role}) -{' '}
              {!member.found
                ? 'tidak ditemukan'
                : member.is_active
                  ? 'akan dinonaktifkan'
                  : 'sudah nonaktif'}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="sid-warning-box">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="sid-primary-button"
        disabled={saving || (!isManual && activeMembers.length === 0)}
      >
        {saving ? 'Menyimpan...' : isManual ? 'Tandai selesai' : 'Nonaktifkan anggota'}
      </button>
    </form>
  )
}
