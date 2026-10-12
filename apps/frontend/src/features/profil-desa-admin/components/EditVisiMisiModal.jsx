// ==========================================
// EditVisiMisiModal.jsx
// Edit vision dan mission berdasarkan
// PATCH /api/villages/profile.
// ==========================================

import { useEffect, useState } from 'react'
import { X, Save } from 'lucide-react'

export default function EditVisiMisiModal({
  open,
  onClose,
  onSubmit,
  initialData,
  processing = false,
}) {
  const [form, setForm] = useState({
    vision: '',
    mission: '',
  })

  useEffect(() => {
    if (!open) return

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      vision: initialData?.vision ?? '',
      mission: initialData?.mission ?? '',
    })
  }, [open, initialData])

  if (!open) return null

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    await onSubmit({
      vision: form.vision.trim(),
      mission: form.mission.trim(),
    })
  }

  return (
    <div
      className="sid-profil-desa-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !processing) {
          onClose()
        }
      }}
    >
      <div
        className="sid-profil-desa-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-visi-misi-title"
      >
        <div className="sid-profil-desa-modal-header">
          <div>
            <p className="sid-profil-desa-modal-eyebrow">Arah Pembangunan</p>

            <h2 id="edit-visi-misi-title">Edit Visi &amp; Misi</h2>

            <p>Perbarui visi dan misi Desa yang ditampilkan pada profil.</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="sid-profil-desa-modal-close"
            disabled={processing}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="sid-profil-desa-modal-form">
          <div className="sid-profil-desa-form-field">
            <label htmlFor="profil-vision">Visi</label>

            <textarea
              id="profil-vision"
              name="vision"
              value={form.vision}
              onChange={handleChange}
              placeholder="Tuliskan visi Desa"
              rows={5}
              disabled={processing}
            />
          </div>

          <div className="sid-profil-desa-form-field">
            <label htmlFor="profil-mission">Misi</label>

            <textarea
              id="profil-mission"
              name="mission"
              value={form.mission}
              onChange={handleChange}
              placeholder="Tuliskan misi Desa"
              rows={8}
              disabled={processing}
            />

            <span className="sid-profil-desa-form-help">
              Misi disimpan sebagai satu teks sesuai format backend.
            </span>
          </div>

          <div className="sid-profil-desa-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="sid-profil-desa-modal-secondary"
              disabled={processing}
            >
              Batal
            </button>

            <button type="submit" className="sid-profil-desa-modal-primary" disabled={processing}>
              <Save size={15} />

              {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
