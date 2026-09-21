// ==========================================
// EditProfilDesaModal.jsx
// Edit informasi profil desa berdasarkan
// contract PATCH /api/villages/profile.
// ==========================================

import { useEffect, useState } from 'react'
import { X, Save } from 'lucide-react'

const EMPTY_FORM = {
  name: '',
  head_name: '',
  address: '',
  phone: '',
  history: '',
}

export default function EditProfilDesaModal({
  open,
  onClose,
  onSubmit,
  initialData,
  processing = false,
}) {
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      name: initialData?.name ?? '',
      head_name: initialData?.head_name ?? '',
      address: initialData?.address ?? '',
      phone: initialData?.phone ?? '',
      history: initialData?.history ?? '',
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

    if (!form.name.trim() || !form.head_name.trim()) {
      return
    }

    await onSubmit({
      name: form.name.trim(),
      head_name: form.head_name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      history: form.history.trim(),
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
        aria-labelledby="edit-profil-desa-title"
      >
        <div className="sid-profil-desa-modal-header">
          <div>
            <p className="sid-profil-desa-modal-eyebrow">Profil Desa</p>

            <h2 id="edit-profil-desa-title">Edit Profil Desa</h2>

            <p>Perbarui informasi resmi Desa yang ditampilkan pada sistem.</p>
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
          <div className="sid-profil-desa-form-grid">
            <div className="sid-profil-desa-form-field">
              <label htmlFor="profil-name">Nama Desa</label>

              <input
                id="profil-name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Masukkan nama desa"
                maxLength={100}
                required
                disabled={processing}
              />
            </div>

            <div className="sid-profil-desa-form-field">
              <label htmlFor="profil-head-name">Nama Kepala Desa</label>

              <input
                id="profil-head-name"
                name="head_name"
                type="text"
                value={form.head_name}
                onChange={handleChange}
                placeholder="Masukkan nama kepala desa"
                maxLength={100}
                required
                disabled={processing}
              />
            </div>

            <div className="sid-profil-desa-form-field sid-profil-desa-form-field-full">
              <label htmlFor="profil-address">Alamat</label>

              <textarea
                id="profil-address"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Masukkan alamat desa"
                rows={3}
                disabled={processing}
              />
            </div>

            <div className="sid-profil-desa-form-field">
              <label htmlFor="profil-phone">Nomor Telepon</label>

              <input
                id="profil-phone"
                name="phone"
                type="text"
                value={form.phone}
                onChange={handleChange}
                placeholder="Contoh: 081234567890"
                maxLength={20}
                disabled={processing}
              />
            </div>

            <div className="sid-profil-desa-form-field sid-profil-desa-form-field-full">
              <label htmlFor="profil-history">Sejarah Desa</label>

              <textarea
                id="profil-history"
                name="history"
                value={form.history}
                onChange={handleChange}
                placeholder="Tuliskan sejarah Desa"
                rows={6}
                disabled={processing}
              />
            </div>
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

            <button
              type="submit"
              className="sid-profil-desa-modal-primary"
              disabled={processing || !form.name.trim() || !form.head_name.trim()}
            >
              <Save size={15} />

              {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
