import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'

const EMPTY_FORM = {
  name: '',
  head_name: '',
  code: '',
  address: '',
  phone: '',
}

export default function EditInformasiUmumModal({
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
      code: initialData?.code ?? '',
      address: initialData?.address ?? '',
      phone: initialData?.phone ?? '',
    })
  }, [open, initialData])

  if (!open) return null

  const handleChange = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
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
    })
  }

  return (
    <div className="sid-modal-overlay">
      <form onSubmit={handleSubmit} className="sid-modal-card sid-edit-info-modal">
        <div className="sid-modal-header">
          <div>
            <p className="sid-modal-eyebrow">Profil Desa</p>

            <h2 className="sid-modal-title">Edit Informasi Umum</h2>

            <p className="sid-modal-description">
              Perbarui informasi dasar Desa yang ditampilkan pada sistem.
            </p>
          </div>
        </div>

        <div className="sid-edit-info-fields">
          <div className="sid-form-group">
            <label className="sid-label" htmlFor="profil-name">
              Nama Desa
            </label>

            <input
              id="profil-name"
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              className="sid-input"
              placeholder="Masukkan nama desa"
              maxLength={100}
              required
              disabled={processing}
            />
          </div>

          <div className="sid-form-group">
            <label className="sid-label" htmlFor="profil-head-name">
              Kepala Desa
            </label>

            <input
              id="profil-head-name"
              type="text"
              value={form.head_name}
              onChange={handleChange('head_name')}
              className="sid-input"
              placeholder="Masukkan nama kepala desa"
              maxLength={100}
              required
              disabled={processing}
            />
          </div>

          <div className="sid-form-group">
            <label className="sid-label" htmlFor="profil-code">
              Kode Desa
            </label>

            <input
              id="profil-code"
              type="text"
              value={form.code}
              className="sid-input"
              readOnly
              disabled
            />

            <span className="sid-form-help">Kode desa dikelola oleh sistem.</span>
          </div>

          <div className="sid-form-group">
            <label className="sid-label" htmlFor="profil-phone">
              Telepon
            </label>

            <input
              id="profil-phone"
              type="text"
              value={form.phone}
              onChange={handleChange('phone')}
              className="sid-input"
              placeholder="Contoh: 081234567890"
              maxLength={20}
              disabled={processing}
            />
          </div>

          <div className="sid-form-group sid-edit-info-field-full">
            <label className="sid-label" htmlFor="profil-address">
              Alamat
            </label>

            <textarea
              id="profil-address"
              value={form.address}
              onChange={handleChange('address')}
              className="sid-input sid-textarea"
              placeholder="Masukkan alamat desa"
              rows={4}
              disabled={processing}
            />
          </div>
        </div>

        <div className="sid-actions sid-modal-actions">
          <button
            type="button"
            onClick={onClose}
            className="sid-btn sid-btn-secondary"
            disabled={processing}
          >
            Batal
          </button>

          <button
            type="submit"
            className="sid-btn sid-btn-primary sid-modal-submit"
            disabled={processing || !form.name.trim() || !form.head_name.trim()}
          >
            <Send size={16} />

            {processing ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  )
}
