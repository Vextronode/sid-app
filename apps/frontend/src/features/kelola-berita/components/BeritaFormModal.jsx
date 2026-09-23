/* eslint-disable react-hooks/set-state-in-effect */

// ==========================================
// BeritaFormModal.jsx
// Popup form Tambah/Edit Berita.
// Styling menggunakan SID Global Theme.
// ==========================================

import { useState, useEffect } from 'react'
import { Send, Image as ImageIcon } from 'lucide-react'

const KATEGORI_OPTIONS = [
  'Umum',
  'Pencapaian Utama',
  'Community Update',
  'Infrastruktur',
  'Sejarah',
  'Pendidikan',
  'Lingkungan',
  'Budaya',
]

const INITIAL_FORM = {
  title: '',
  category: 'Umum',
  content: '',
  thumbnail: null,
}

export default function BeritaFormModal({
  open,
  onClose,
  onSubmit,
  onDelete,
  initialData,
  processing = false,
}) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [imagePreview, setImagePreview] = useState(null)

  // ==========================================
  // INITIAL DATA
  // ==========================================
  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title ?? '',
        category: initialData.category ?? 'Umum',
        content: initialData.content ?? '',
        thumbnail: initialData.image ?? null,
      })

      setImagePreview(initialData.thumbnail ?? null)

      return
    }

    setForm(INITIAL_FORM)
    setImagePreview(null)
  }, [initialData, open])

  if (!open) return null

  // ==========================================
  // HANDLE INPUT
  // ==========================================
  const handleChange = (field) => (e) => {
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }))
  }

  // ==========================================
  // HANDLE IMAGE
  // ==========================================
  const handleImageChange = (e) => {
    const file = e.target.files?.[0]

    if (!file) return

    setForm((prev) => ({
      ...prev,
      thumbnail: file,
    }))

    const reader = new FileReader()

    reader.onload = () => {
      setImagePreview(reader.result)
    }

    reader.readAsDataURL(file)
  }

  // ==========================================
  // HANDLE SUBMIT
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (processing) return

    await onSubmit(form)
  }

  return (
    <div className="sid-berita-modal-overlay">
      <form onSubmit={handleSubmit} className="sid-berita-modal">
        {/* ==========================================
            HEADER
        ========================================== */}
        <div className="sid-berita-modal-header">
          <h2 className="sid-berita-modal-title">
            {initialData ? 'Edit Berita' : 'Tambah Berita'}
          </h2>
        </div>

        {/* ==========================================
            JUDUL
        ========================================== */}
        <div className="sid-berita-form-group">
          <label htmlFor="berita-title" className="sid-berita-form-label">
            Judul *
          </label>

          <input
            id="berita-title"
            type="text"
            required
            value={form.title}
            onChange={handleChange('title')}
            placeholder="Judul berita atau pengumuman"
            className="sid-berita-form-input"
            disabled={processing}
          />
        </div>

        {/* ==========================================
            KATEGORI
        ========================================== */}
        <div className="sid-berita-form-group">
          <label htmlFor="berita-category" className="sid-berita-form-label">
            Kategori
          </label>

          <select
            id="berita-category"
            value={form.category}
            onChange={handleChange('category')}
            className="sid-berita-form-input"
            disabled={processing}
          >
            {KATEGORI_OPTIONS.map((kategori) => (
              <option key={kategori} value={kategori}>
                {kategori}
              </option>
            ))}
          </select>
        </div>

        {/* ==========================================
            KONTEN
        ========================================== */}
        <div className="sid-berita-form-group">
          <label htmlFor="berita-content" className="sid-berita-form-label">
            Konten *
          </label>

          <textarea
            id="berita-content"
            required
            rows={7}
            value={form.content}
            onChange={handleChange('content')}
            placeholder="Tuliskan isi berita atau pengumuman di sini..."
            className="sid-berita-form-textarea"
            disabled={processing}
          />
        </div>

        {/* ==========================================
            THUMBNAIL
        ========================================== */}
        <div className="sid-berita-form-group">
          <label className="sid-berita-form-label">Thumbnail (opsional)</label>

          <label className="sid-berita-upload">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Preview thumbnail berita"
                className="sid-berita-upload-preview"
              />
            ) : (
              <>
                <ImageIcon size={20} />
                <span>Upload gambar</span>
              </>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="sid-berita-upload-input"
              disabled={processing}
            />
          </label>
        </div>

        {/* ==========================================
            ACTION
        ========================================== */}
        <div className="sid-berita-modal-actions">
          {initialData && (
            <button
              type="button"
              onClick={() => onDelete?.(initialData)}
              className="sid-berita-modal-delete"
              disabled={processing}
            >
              Hapus Berita
            </button>
          )}

          <div className="sid-berita-modal-actions-right">
            <button
              type="button"
              onClick={onClose}
              className="sid-berita-modal-cancel"
              disabled={processing}
            >
              Batal
            </button>

            <button type="submit" className="sid-berita-modal-submit" disabled={processing}>
              <Send size={16} />

              {processing ? 'Menyimpan...' : initialData ? 'Simpan Perubahan' : 'Simpan Berita'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
