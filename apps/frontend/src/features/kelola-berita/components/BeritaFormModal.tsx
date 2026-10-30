/* eslint-disable react-hooks/set-state-in-effect */

// ==========================================
// BeritaFormModal.tsx
// Popup form Tambah/Edit Berita.
// Styling menggunakan SID Global Theme.
// ==========================================

import { useState, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import { Send, Image as ImageIcon } from 'lucide-react'

import { categoryErrorMessage } from '@/features/kelola-berita/hooks/useNewsCategories'
import { useConfirmDiscard } from '@/shared/hooks/useConfirmDiscard'
import { isFormDirty } from '@/shared/lib/isFormDirty'

// Satu berita wajib punya 1 kategori, maksimal 2.
const MAX_KATEGORI = 2

export type BeritaForm = {
  title: string
  category_ids: number[]
  content: string
  // Hanya berkas baru; gambar tersimpan tetap dipakai bila kosong.
  thumbnail: File | null
}

// Berita yang diedit (NewsResource).
type BeritaInitialData = {
  title?: string
  content?: string
  thumbnail?: string | null
  categories?: { id: number }[]
}

type BeritaFormModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (form: BeritaForm) => unknown
  onDelete?: (berita: BeritaInitialData) => unknown
  // Kosong: tambah berita baru.
  initialData?: BeritaInitialData | null
  categories?: { id: number; name: string }[]
  processing?: boolean
}

const INITIAL_FORM: BeritaForm = {
  title: '',
  category_ids: [],
  content: '',
  thumbnail: null,
}

export default function BeritaFormModal({
  open,
  onClose,
  onSubmit,
  onDelete,
  initialData,
  categories = [],
  processing = false,
}: BeritaFormModalProps) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [baseline, setBaseline] = useState(INITIAL_FORM)
  const requestClose = useConfirmDiscard(open && isFormDirty(form, baseline), {
    disabled: processing,
    escapeClose: open ? onClose : null,
  })

  // ==========================================
  // INITIAL DATA
  // ==========================================
  useEffect(() => {
    if (initialData) {
      const initialForm: BeritaForm = {
        title: initialData.title ?? '',
        category_ids: (initialData.categories ?? []).map((category) => category.id),
        content: initialData.content ?? '',
        // Gambar tersimpan hanya dipratinjau (initialData.thumbnail), tidak dikirim ulang.
        thumbnail: null,
      }
      setForm(initialForm)
      setBaseline(initialForm)

      setImagePreview(initialData.thumbnail ?? null)
      setError('')

      return
    }

    setForm(INITIAL_FORM)
    setBaseline(INITIAL_FORM)
    setImagePreview(null)
    setError('')
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
  // HANDLE KATEGORI (1-2)
  // ==========================================
  const toggleCategory = (id) => {
    setError('')
    setForm((prev) => {
      const selected = prev.category_ids.includes(id)

      if (!selected && prev.category_ids.length >= MAX_KATEGORI) return prev

      return {
        ...prev,
        category_ids: selected
          ? prev.category_ids.filter((categoryId) => categoryId !== id)
          : [...prev.category_ids, id],
      }
    })
  }

  // ==========================================
  // HANDLE IMAGE
  // ==========================================
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (!file) return

    setForm((prev) => ({
      ...prev,
      thumbnail: file,
    }))

    const reader = new FileReader()

    reader.onload = () => {
      // readAsDataURL selalu menghasilkan string data URL.
      setImagePreview(reader.result as string)
    }

    reader.readAsDataURL(file)
  }

  // ==========================================
  // HANDLE SUBMIT
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (processing) return

    if (form.category_ids.length === 0) {
      setError('Pilih minimal 1 kategori berita.')
      return
    }

    try {
      await onSubmit(form)
    } catch (submitError) {
      setError(categoryErrorMessage(submitError, 'Berita gagal disimpan.'))
    }
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
        <fieldset className="sid-berita-form-group sid-berita-category-fieldset">
          <legend className="sid-berita-form-label">Kategori *</legend>

          <p className="sid-berita-form-help">
            Pilih 1–{MAX_KATEGORI} kategori ({form.category_ids.length}/{MAX_KATEGORI} dipilih)
          </p>

          {categories.length === 0 ? (
            <p className="sid-berita-form-help">
              Belum ada kategori. Tambahkan lewat tombol Kelola Kategori.
            </p>
          ) : (
            <div className="sid-berita-category-options">
              {categories.map((category) => {
                const checked = form.category_ids.includes(category.id)
                const full = !checked && form.category_ids.length >= MAX_KATEGORI

                return (
                  <label
                    key={category.id}
                    className={`sid-berita-category-option${checked ? ' is-selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategory(category.id)}
                      disabled={processing || full}
                    />
                    {category.name}
                  </label>
                )
              })}
            </div>
          )}
        </fieldset>

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
                alt="Pratinjau gambar berita"
                className="sid-berita-upload-preview"
              />
            ) : (
              <>
                <ImageIcon size={20} />
                <span>Unggah gambar</span>
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

        {error && (
          <p className="sid-berita-form-error" role="alert">
            {error}
          </p>
        )}

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
              onClick={() => requestClose(onClose)}
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
