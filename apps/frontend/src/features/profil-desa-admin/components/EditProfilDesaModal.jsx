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
  district: '',
  regency: '',
  province: '',
  postal_code: '',
  email: '',
  area_ha: '',
  history: '',
  office_hours: '',
  map_url: '',
  hero_photo_credit: '',
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
      district: initialData?.district ?? '',
      regency: initialData?.regency ?? '',
      province: initialData?.province ?? '',
      postal_code: initialData?.postal_code ?? '',
      email: initialData?.email ?? '',
      area_ha: initialData?.area_ha ?? '',
      history: initialData?.history ?? '',
      office_hours: initialData?.office_hours ?? '',
      map_url: initialData?.map_url ?? '',
      hero_photo_credit: initialData?.hero_photo_credit ?? '',
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
      district: form.district.trim(),
      regency: form.regency.trim(),
      province: form.province.trim(),
      postal_code: form.postal_code.trim(),
      email: form.email.trim(),
      area_ha: form.area_ha,
      history: form.history.trim(),
      office_hours: form.office_hours.trim(),
      map_url: form.map_url.trim(),
      hero_photo_credit: form.hero_photo_credit.trim(),
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

            <p className="sid-profil-desa-form-field-full">
              Data berikut tercetak di kop surat dan redaksi surat keterangan.
            </p>

            <div className="sid-profil-desa-form-field">
              <label htmlFor="profil-district">Kecamatan</label>

              <input
                id="profil-district"
                name="district"
                type="text"
                value={form.district}
                onChange={handleChange}
                placeholder="Contoh: Parigi"
                maxLength={100}
                disabled={processing}
              />
            </div>

            <div className="sid-profil-desa-form-field">
              <label htmlFor="profil-regency">Kabupaten/Kota</label>

              <input
                id="profil-regency"
                name="regency"
                type="text"
                value={form.regency}
                onChange={handleChange}
                placeholder="Contoh: Pangandaran"
                maxLength={100}
                disabled={processing}
              />
            </div>

            <div className="sid-profil-desa-form-field">
              <label htmlFor="profil-province">Provinsi</label>

              <input
                id="profil-province"
                name="province"
                type="text"
                value={form.province}
                onChange={handleChange}
                placeholder="Contoh: Jawa Barat"
                maxLength={100}
                disabled={processing}
              />
            </div>

            <div className="sid-profil-desa-form-field">
              <label htmlFor="profil-postal_code">Kode Pos</label>

              <input
                id="profil-postal_code"
                name="postal_code"
                type="text"
                value={form.postal_code}
                onChange={handleChange}
                placeholder="Contoh: 46393"
                maxLength={10}
                disabled={processing}
              />
            </div>

            <div className="sid-profil-desa-form-field">
              <label htmlFor="profil-email">Email Kantor Desa</label>

              <input
                id="profil-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Contoh: kantordesa@contoh.id"
                maxLength={150}
                disabled={processing}
              />
            </div>

            <div className="sid-profil-desa-form-field">
              <label htmlFor="profil-area_ha">Luas Wilayah (ha)</label>

              <input
                id="profil-area_ha"
                name="area_ha"
                type="number"
                min={0}
                step="0.001"
                inputMode="decimal"
                value={form.area_ha}
                onChange={handleChange}
                placeholder="Contoh: 759.319"
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

            <div className="sid-profil-desa-form-field">
              <label htmlFor="profil-office-hours">Jam Layanan Kantor</label>

              <input
                id="profil-office-hours"
                name="office_hours"
                type="text"
                value={form.office_hours}
                onChange={handleChange}
                placeholder="Contoh: Senin – Jumat, 08.00 – 16.00 WIB"
                maxLength={100}
                disabled={processing}
              />
            </div>

            <div className="sid-profil-desa-form-field">
              <label htmlFor="profil-hero-credit">Kredit Foto Beranda</label>

              <input
                id="profil-hero-credit"
                name="hero_photo_credit"
                type="text"
                value={form.hero_photo_credit}
                onChange={handleChange}
                placeholder="Contoh: Dokumentasi Desa (opsional)"
                maxLength={100}
                disabled={processing}
              />
            </div>

            <div className="sid-profil-desa-form-field sid-profil-desa-form-field-full">
              <label htmlFor="profil-map-url">Link Google Maps Kantor Desa</label>

              <input
                id="profil-map-url"
                name="map_url"
                type="url"
                value={form.map_url}
                onChange={handleChange}
                placeholder="Contoh: https://maps.app.goo.gl/..."
                maxLength={500}
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
