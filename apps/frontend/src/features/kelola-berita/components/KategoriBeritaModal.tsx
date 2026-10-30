// ==========================================
// KategoriBeritaModal.tsx
// Popup kelola kategori berita: tambah, ubah nama, hapus.
// Kategori yang sudah dipakai berita tidak bisa dihapus.
// ==========================================

import { useState } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'

import { categoryErrorMessage } from '@/features/kelola-berita/hooks/useNewsCategories'
import { confirmDialog } from '@/shared/lib/dialog'
import { useConfirmDiscard } from '@/shared/hooks/useConfirmDiscard'
import { notifySuccess } from '@/shared/lib/toast'

export default function KategoriBeritaModal({
  open,
  onClose,
  categories,
  loading = false,
  processing = false,
  onAdd,
  onRename,
  onDelete,
}) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState('')

  const closeModal = () => {
    setEditingId(null)
    setEditingName('')
    setNewName('')
    setError('')
    onClose()
  }

  // Nama kategori baru yang belum ditambahkan atau rename yang belum disimpan.
  const requestClose = useConfirmDiscard(
    open && (newName.trim() !== '' || (editingId !== null && editingName.trim() !== '')),
    { disabled: processing, escapeClose: open ? closeModal : null },
  )

  if (!open) return null

  const attempt = async (request, fallback) => {
    setError('')

    try {
      await request()
      return true
    } catch (requestError) {
      setError(categoryErrorMessage(requestError, fallback))
      return false
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()

    const name = newName.trim()
    if (!name || processing) return

    if (await attempt(() => onAdd(name), 'Kategori gagal ditambahkan.')) {
      notifySuccess(`Kategori "${name}" berhasil ditambahkan.`)
      setNewName('')
    }
  }

  const startEdit = (category) => {
    setError('')
    setEditingId(category.id)
    setEditingName(category.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleRename = async (e) => {
    e.preventDefault()

    const name = editingName.trim()
    if (!name || processing) return

    if (await attempt(() => onRename(editingId, name), 'Kategori gagal diubah.')) {
      notifySuccess(`Kategori berhasil diubah menjadi "${name}".`)
      cancelEdit()
    }
  }

  const handleDelete = async (category) => {
    if (processing || !category.can_delete) return

    if (
      !(await confirmDialog({
        title: `Hapus kategori "${category.name}"?`,
        message: 'Tindakan ini tidak dapat dibatalkan.',
        confirmLabel: 'Hapus',
      }))
    )
      return

    if (await attempt(() => onDelete(category.id), 'Kategori gagal dihapus.')) {
      notifySuccess(`Kategori "${category.name}" berhasil dihapus.`)
    }
  }

  const handleClose = () => requestClose(closeModal)

  return (
    <div className="sid-berita-modal-overlay">
      <div
        className="sid-berita-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kategori-berita-title"
      >
        <div className="sid-berita-modal-header">
          <h2 id="kategori-berita-title" className="sid-berita-modal-title">
            Kelola Kategori Berita
          </h2>
        </div>

        {/* TAMBAH */}
        <form onSubmit={handleAdd} className="sid-kategori-berita-add">
          <label htmlFor="kategori-baru" className="sr-only">
            Nama kategori baru
          </label>
          <input
            id="kategori-baru"
            type="text"
            maxLength={50}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nama kategori baru"
            className="sid-berita-form-input"
            disabled={processing}
          />
          <button
            type="submit"
            className="sid-kelola-berita-primary"
            disabled={processing || !newName.trim()}
          >
            <Plus size={16} />
            Tambah
          </button>
        </form>

        {error && (
          <p className="sid-berita-form-error" role="alert">
            {error}
          </p>
        )}

        {/* DAFTAR */}
        {loading ? (
          <p className="sid-berita-form-help">Memuat kategori...</p>
        ) : categories.length === 0 ? (
          <p className="sid-berita-form-help">Belum ada kategori berita.</p>
        ) : (
          <ul className="sid-kategori-berita-list">
            {categories.map((category) => (
              <li key={category.id} className="sid-kategori-berita-item">
                {editingId === category.id ? (
                  <form onSubmit={handleRename} className="sid-kategori-berita-edit">
                    <label htmlFor={`kategori-${category.id}`} className="sr-only">
                      Nama kategori
                    </label>
                    <input
                      id={`kategori-${category.id}`}
                      type="text"
                      maxLength={50}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="sid-berita-form-input"
                      disabled={processing}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="sid-kategori-berita-icon"
                      disabled={processing || !editingName.trim()}
                      title="Simpan"
                      aria-label="Simpan nama kategori"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="sid-kategori-berita-icon"
                      disabled={processing}
                      title="Batal"
                      aria-label="Batal ubah kategori"
                    >
                      <X size={16} />
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="sid-kategori-berita-info">
                      <span className="sid-kategori-berita-name">{category.name}</span>
                      <span className="sid-kategori-berita-count">
                        {category.news_count ?? 0} berita
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => startEdit(category)}
                      className="sid-kategori-berita-icon"
                      disabled={processing}
                      title="Ubah nama"
                      aria-label={`Ubah kategori ${category.name}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(category)}
                      className="sid-kategori-berita-icon is-danger"
                      disabled={processing || !category.can_delete}
                      title={
                        category.can_delete
                          ? 'Hapus kategori'
                          : 'Sudah dipakai berita, tidak bisa dihapus'
                      }
                      aria-label={`Hapus kategori ${category.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="sid-berita-modal-actions">
          <div className="sid-berita-modal-actions-right">
            <button
              type="button"
              onClick={handleClose}
              className="sid-berita-modal-cancel"
              disabled={processing}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
