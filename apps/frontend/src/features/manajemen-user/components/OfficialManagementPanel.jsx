/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeftRight, Trash2, UserRoundMinus } from 'lucide-react'

import { getUsers } from '../api'
import {
  demotePerangkatDesa,
  deletePerangkatDesa,
  getPerangkatDesa,
  rotatePerangkatDesa,
} from '@/features/profil-desa-admin/api'

const today = new Date().toISOString().slice(0, 10)

function unwrap(response) {
  return response?.data?.data ?? []
}

export default function OfficialManagementPanel() {
  const [officials, setOfficials] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [rotation, setRotation] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [officialResponse, userResponse] = await Promise.all([getPerangkatDesa(), getUsers()])
      setOfficials(unwrap(officialResponse))
      setUsers(unwrap(userResponse))
    } catch (err) {
      setError(err?.response?.data?.message || 'Gagal memuat data pejabat.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const eligibleUsers = users.filter(
    (user) => user.role === 'warga' && user.is_active && user.citizen && !user.official,
  )

  const refreshWithMessage = async (request, successMessage) => {
    setProcessing(true)
    setError('')
    setSuccess('')
    try {
      await request()
      setSuccess(successMessage)
      setRotation(null)
      await loadData()
      return true
    } catch (err) {
      setError(err?.response?.data?.message || 'Aksi pejabat gagal diproses.')
      return false
    } finally {
      setProcessing(false)
    }
  }

  const handleDemote = (official) => {
    if (!window.confirm(`Turunkan ${official.citizen?.name ?? 'pejabat'} dari jabatannya?`)) return
    return refreshWithMessage(
      () => demotePerangkatDesa(official.id),
      'Jabatan pejabat berhasil diakhiri.',
    )
  }

  const handleDelete = (official) => {
    if (!window.confirm(`Hapus data pejabat ${official.citizen?.name ?? ''}?`)) return
    return refreshWithMessage(
      () => deletePerangkatDesa(official.id),
      'Data pejabat berhasil dihapus.',
    )
  }

  const handleRotate = async (event) => {
    event.preventDefault()
    const { official, user_id, started_at, term_ends_at } = rotation
    await refreshWithMessage(
      () =>
        rotatePerangkatDesa(official.id, {
          user_id,
          started_at,
          ...(term_ends_at ? { term_ends_at } : {}),
        }),
      'Rotasi pejabat berhasil diproses.',
    )
  }

  return (
    <section
      className="sid-operator-table-card sid-admin-officials-panel"
      aria-labelledby="officials-heading"
    >
      <div className="sid-operator-header sid-admin-officials-header">
        <div>
          <h2 id="officials-heading">Pejabat Desa</h2>
          <p>Kelola pejabat desa yang sudah ditetapkan.</p>
        </div>
      </div>

      {error && (
        <p className="sid-admin-panel-message sid-admin-alert-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="sid-admin-panel-message sid-admin-alert-success" role="status">
          {success}
        </p>
      )}

      <div className="sid-operator-table-wrapper">
        <table className="sid-operator-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Jabatan</th>
              <th>Wilayah</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="empty">
                  Memuat data pejabat...
                </td>
              </tr>
            ) : officials.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty">
                  Belum ada data pejabat.
                </td>
              </tr>
            ) : (
              officials.map((official) => (
                <tr key={official.id}>
                  <td>{official.citizen?.name ?? '-'}</td>
                  <td>{official.position?.replaceAll('_', ' ') ?? '-'}</td>
                  <td>
                    RT {official.rt?.number ?? '-'} / RW {official.rw?.number ?? '-'} / Dusun{' '}
                    {official.hamlet?.name ?? '-'}
                  </td>
                  <td>{official.is_active ? 'Aktif' : 'Tidak aktif'}</td>
                  <td>
                    <div className="sid-operator-actions">
                      {official.is_active && official.user_id && (
                        <>
                          <button
                            type="button"
                            title="Rotasi pejabat"
                            disabled={
                              processing ||
                              official.position === 'petugas_desa' ||
                              eligibleUsers.length === 0
                            }
                            onClick={() =>
                              setRotation({
                                official,
                                user_id: '',
                                started_at: today,
                                term_ends_at: '',
                              })
                            }
                          >
                            <ArrowLeftRight size={16} />
                          </button>
                          <button
                            type="button"
                            title="Akhiri jabatan"
                            disabled={processing}
                            onClick={() => handleDemote(official)}
                          >
                            <UserRoundMinus size={16} />
                          </button>
                        </>
                      )}
                      {!official.is_active && (
                        <button
                          type="button"
                          title="Hapus data pejabat"
                          disabled={processing}
                          onClick={() => handleDelete(official)}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rotation && (
        <div className="sid-modal-overlay">
          <form className="sid-modal" onSubmit={handleRotate}>
            <h2>Rotasi {rotation.official.position?.replaceAll('_', ' ')}</h2>
            <label className="sid-form-group">
              <span className="sid-form-label">Pengganti *</span>
              <select
                required
                value={rotation.user_id}
                onChange={(event) => setRotation({ ...rotation, user_id: event.target.value })}
              >
                <option value="">Pilih akun warga aktif</option>
                {eligibleUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.citizen.name ?? user.name}
                    {user.username ? ` — @${user.username}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="sid-form-group">
              <span className="sid-form-label">Mulai menjabat *</span>
              <input
                required
                type="date"
                value={rotation.started_at}
                onChange={(event) => setRotation({ ...rotation, started_at: event.target.value })}
              />
            </label>
            <label className="sid-form-group">
              <span className="sid-form-label">Akhir masa jabatan</span>
              <input
                type="date"
                value={rotation.term_ends_at}
                onChange={(event) => setRotation({ ...rotation, term_ends_at: event.target.value })}
              />
            </label>
            <div className="sid-modal-actions">
              <button
                type="button"
                className="sid-button sid-button-outline"
                onClick={() => setRotation(null)}
              >
                Batal
              </button>
              <button type="submit" className="sid-button sid-button-primary" disabled={processing}>
                {processing ? 'Memproses...' : 'Rotasi'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
