import { Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { SiteFooter } from '@/components/layout/SiteFooter'
import {
  createRegulation,
  deleteRegulation,
  getRegulations,
  updateRegulation,
} from '@/features/peraturan/api'

function resolveError(error, fallback) {
  const errors = error?.response?.data?.errors

  return (errors && Object.values(errors).flat()[0]) || error?.response?.data?.message || fallback
}

function formatDate(value) {
  if (!value) return '-'

  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function RegulationFormModal({ item, processing, error, onClose, onSubmit }) {
  const isEdit = Boolean(item?.id)
  const [form, setForm] = useState({
    regulation_number: item?.regulation_number ?? '',
    title: item?.title ?? '',
    content: item?.content ?? '',
    enacted_date: item?.enacted_date ?? '',
  })

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const success = await onSubmit({
      regulation_number: form.regulation_number.trim(),
      title: form.title.trim(),
      content: form.content.trim(),
      enacted_date: form.enacted_date || null,
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
            <span className="sid-wilayah-modal-eyebrow">Peraturan Desa</span>
            <h2>{isEdit ? 'Edit' : 'Tambah'} Peraturan</h2>
          </div>

          <button type="button" onClick={onClose} className="sid-wilayah-modal-close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="sid-wilayah-form-group">
            <label htmlFor="peraturan-number">Nomor Peraturan</label>
            <input
              id="peraturan-number"
              type="text"
              value={form.regulation_number}
              onChange={(event) => handleChange('regulation_number', event.target.value)}
              placeholder="Contoh: 03/PERDES/2026"
              maxLength={100}
              required
            />
          </div>

          <div className="sid-wilayah-form-group">
            <label htmlFor="peraturan-title">Judul</label>
            <input
              id="peraturan-title"
              type="text"
              value={form.title}
              onChange={(event) => handleChange('title', event.target.value)}
              maxLength={200}
              required
            />
          </div>

          <div className="sid-wilayah-form-group">
            <label htmlFor="peraturan-date">Tanggal Ditetapkan</label>
            <input
              id="peraturan-date"
              type="date"
              value={form.enacted_date}
              onChange={(event) => handleChange('enacted_date', event.target.value)}
            />
          </div>

          <div className="sid-wilayah-form-group">
            <label htmlFor="peraturan-content">Isi Peraturan</label>
            <textarea
              id="peraturan-content"
              rows={8}
              value={form.content}
              onChange={(event) => handleChange('content', event.target.value)}
              required
            />
          </div>

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

export default function KelolaPeraturanPage() {
  const [regulations, setRegulations] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState({ open: false, item: null })

  const load = useCallback(async () => {
    try {
      const response = await getRegulations()

      setRegulations(response.data?.data ?? [])
      setError('')
    } catch (requestError) {
      setError(resolveError(requestError, 'Gagal memuat peraturan desa.'))
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

    if (!keyword) return regulations

    return regulations.filter(
      (item) =>
        item.title.toLowerCase().includes(keyword) ||
        item.regulation_number.toLowerCase().includes(keyword),
    )
  }, [regulations, search])

  const closeModal = () => {
    setModal({ open: false, item: null })
    setFormError('')
  }

  const handleSubmit = async (payload) => {
    setProcessing(true)
    setFormError('')

    try {
      if (modal.item) {
        await updateRegulation(modal.item.id, payload)
      } else {
        await createRegulation(payload)
      }

      await load()

      return true
    } catch (requestError) {
      setFormError(resolveError(requestError, 'Gagal menyimpan peraturan desa.'))

      return false
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Hapus peraturan "${item.title}"?`)) return

    setProcessing(true)

    try {
      await deleteRegulation(item.id)
      await load()
    } catch (requestError) {
      setError(resolveError(requestError, 'Gagal menghapus peraturan desa.'))
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
            <p>Memuat peraturan desa...</p>
          </div>
        </div>

        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="sid-kelola-wilayah-page">
      <div className="sid-kelola-wilayah-content">
        <div className="sid-kelola-wilayah-header">
          <div>
            <span className="sid-kelola-wilayah-eyebrow">Konten Desa</span>

            <h1>Peraturan Desa</h1>

            <p>Kelola peraturan desa yang ditampilkan pada halaman publik.</p>
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
              Tambah Peraturan
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
              <h3>Daftar Peraturan</h3>
              <p>{regulations.length} peraturan tercatat.</p>
            </div>

            <div className="sid-wilayah-search">
              <Search size={16} />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nomor atau judul..."
              />
            </div>
          </div>

          <div className="sid-wilayah-table-wrap">
            <table className="sid-wilayah-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nomor</th>
                  <th>Judul</th>
                  <th>Ditetapkan</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan="5">
                      <div className="sid-wilayah-empty">Belum ada peraturan desa.</div>
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td className="sid-wilayah-code">{item.regulation_number}</td>
                      <td className="sid-wilayah-name">{item.title}</td>
                      <td>{formatDate(item.enacted_date)}</td>
                      <td>
                        <div className="sid-wilayah-actions">
                          <button
                            type="button"
                            onClick={() => setModal({ open: true, item })}
                            className="sid-wilayah-action sid-wilayah-action-edit"
                            title="Edit Peraturan"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDelete(item)}
                            className="sid-wilayah-action sid-wilayah-action-delete"
                            title="Hapus Peraturan"
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

      <SiteFooter />

      {modal.open && (
        <RegulationFormModal
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
