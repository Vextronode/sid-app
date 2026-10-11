import { Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { FooterOperator } from '@/components/layout/FooterOperator'
import {
  createOccupation,
  deleteOccupation,
  getOccupations,
  updateOccupation,
} from '@/features/pekerjaan/api'

function resolveError(error, fallback) {
  const errors = error?.response?.data?.errors

  return (errors && Object.values(errors).flat()[0]) || error?.response?.data?.message || fallback
}

function OccupationFormModal({ item, processing, error, onClose, onSubmit }) {
  const isEdit = Boolean(item?.id)
  const [form, setForm] = useState({
    name: item?.name ?? '',
    sort_order: item?.sort_order ?? 0,
    is_active: item?.is_active ?? true,
  })

  const handleSubmit = async (event) => {
    event.preventDefault()

    const success = await onSubmit({
      name: form.name.trim(),
      sort_order: Number(form.sort_order) || 0,
      is_active: Boolean(form.is_active),
    })

    if (success) onClose()
  }

  return (
    <div
      className="sid-wilayah-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="sid-wilayah-modal">
        <div className="sid-wilayah-modal-header">
          <div>
            <span className="sid-wilayah-modal-eyebrow">Katalog Pekerjaan</span>
            <h2>{isEdit ? 'Edit' : 'Tambah'} Pekerjaan</h2>
          </div>

          <button type="button" onClick={onClose} className="sid-wilayah-modal-close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="sid-wilayah-form-group">
            <label htmlFor="pekerjaan-name">Nama Pekerjaan</label>
            <input
              id="pekerjaan-name"
              type="text"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Contoh: Petani"
              maxLength={100}
              required
            />
          </div>

          <div className="sid-wilayah-form-group">
            <label htmlFor="pekerjaan-sort-order">Urutan Tampil</label>
            <input
              id="pekerjaan-sort-order"
              type="number"
              min={0}
              value={form.sort_order}
              onChange={(event) =>
                setForm((current) => ({ ...current, sort_order: event.target.value }))
              }
            />
          </div>

          <label className="sid-wilayah-checkbox">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                setForm((current) => ({ ...current, is_active: event.target.checked }))
              }
            />
            <span>Pekerjaan aktif (dapat dipilih pada data warga)</span>
          </label>

          {error && <div className="sid-wilayah-form-error">{error}</div>}

          <div className="sid-wilayah-modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="sid-wilayah-btn sid-wilayah-btn-secondary"
            >
              Batal
            </button>

            <button
              type="submit"
              className="sid-wilayah-btn sid-wilayah-btn-primary"
              disabled={processing}
            >
              {processing ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function KelolaPekerjaanPage() {
  const [occupations, setOccupations] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState({ open: false, item: null })

  const load = useCallback(async () => {
    try {
      const response = await getOccupations({ includeInactive: true })

      setOccupations(response.data?.data ?? [])
      setError('')
    } catch (requestError) {
      setError(resolveError(requestError, 'Gagal memuat katalog pekerjaan.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Muat awal menyinkronkan state dengan data backend.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const data = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    if (!keyword) return occupations

    return occupations.filter((item) => item.name.toLowerCase().includes(keyword))
  }, [occupations, search])

  const closeModal = () => {
    setModal({ open: false, item: null })
    setFormError('')
  }

  const handleSubmit = async (payload) => {
    setProcessing(true)
    setFormError('')

    try {
      if (modal.item) {
        await updateOccupation(modal.item.id, payload)
      } else {
        await createOccupation(payload)
      }

      await load()

      return true
    } catch (requestError) {
      setFormError(resolveError(requestError, 'Gagal menyimpan pekerjaan.'))

      return false
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Hapus pekerjaan "${item.name}"?`)) return

    setProcessing(true)

    try {
      await deleteOccupation(item.id)
      await load()
    } catch (requestError) {
      // 409: pekerjaan masih dipakai warga; pesan backend menyarankan nonaktifkan.
      setError(resolveError(requestError, 'Gagal menghapus pekerjaan.'))
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="sid-kelola-wilayah-page">
        <div className="sid-kelola-wilayah-content">
          <div className="sid-kelola-wilayah-loading">
            <div className="sid-kelola-wilayah-loading-spinner" />
            <p>Memuat katalog pekerjaan...</p>
          </div>
        </div>

        <FooterOperator />
      </div>
    )
  }

  return (
    <div className="sid-kelola-wilayah-page">
      <div className="sid-kelola-wilayah-content">
        <div className="sid-kelola-wilayah-header">
          <div>
            <span className="sid-kelola-wilayah-eyebrow">Master Data</span>

            <h1>Katalog Pekerjaan</h1>

            <p>Kelola daftar pekerjaan yang dapat dipilih pada data warga.</p>
          </div>

          <div className="sid-kelola-wilayah-header-actions">
            <button
              type="button"
              onClick={() => void load()}
              className="sid-wilayah-btn sid-wilayah-btn-secondary"
              disabled={processing}
            >
              <RefreshCw size={15} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => setModal({ open: true, item: null })}
              className="sid-wilayah-btn sid-wilayah-btn-primary"
            >
              <Plus size={16} />
              Tambah Pekerjaan
            </button>
          </div>
        </div>

        {error && (
          <div className="sid-kelola-wilayah-error" role="alert">
            {error}
          </div>
        )}

        <div className="sid-wilayah-table-card">
          <div className="sid-wilayah-table-toolbar">
            <div>
              <h3>Daftar Pekerjaan</h3>
              <p>Pekerjaan yang masih dipakai warga tidak dapat dihapus; nonaktifkan saja.</p>
            </div>

            <div className="sid-wilayah-search">
              <Search size={16} />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari pekerjaan..."
              />
            </div>
          </div>

          <div className="sid-wilayah-table-wrap">
            <table className="sid-wilayah-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Pekerjaan</th>
                  <th>Urutan</th>
                  <th>Dipakai Warga</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan="6">
                      <div className="sid-wilayah-empty">Belum ada data pekerjaan.</div>
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td className="sid-wilayah-name">{item.name}</td>
                      <td>{item.sort_order ?? 0}</td>
                      <td>{item.citizens_count ?? '-'}</td>
                      <td>
                        <span
                          className={`sid-wilayah-status ${
                            item.is_active
                              ? 'sid-wilayah-status-active'
                              : 'sid-wilayah-status-inactive'
                          }`}
                        >
                          {item.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td>
                        <div className="sid-wilayah-actions">
                          <button
                            type="button"
                            onClick={() => setModal({ open: true, item })}
                            className="sid-wilayah-action sid-wilayah-action-edit"
                            title="Edit Pekerjaan"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDelete(item)}
                            className="sid-wilayah-action sid-wilayah-action-delete"
                            title="Hapus Pekerjaan"
                            disabled={processing}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <FooterOperator />

      {modal.open && (
        <OccupationFormModal
          key={modal.item?.id ?? 'new'}
          item={modal.item}
          processing={processing}
          error={formError}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
