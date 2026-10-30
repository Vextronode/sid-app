// ==========================================
// EditProfilDesaModal.jsx
// Edit informasi profil desa berdasarkan
// contract PATCH /api/villages/profile.
// ==========================================

import { useEffect, useState } from 'react'
import { X, Save } from 'lucide-react'

import { formatCoords, parseCoords, villageCoords } from '@/shared/lib/villageMap'
import { resolveMapLink } from '../api'
import { useConfirmDiscard } from '@/shared/hooks/useConfirmDiscard'
import { isFormDirty } from '@/shared/lib/isFormDirty'

// Isian lokasi berupa link (Google Maps), bukan koordinat.
const isLink = (text) => /^https?:\/\//i.test(text.trim())

const COORDS_FORMAT_ERROR =
  'Tempel link Google Maps, atau koordinat dengan format: latitude, longitude. Contoh: -7.6803137, 108.5513816'

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
  // Titik kantor desa sebagai teks "lat, lng".
  coords: '',
  hero_photo_credit: '',
  welcome_message: '',
}

export default function EditProfilDesaModal({
  open,
  onClose,
  onSubmit,
  initialData,
  processing = false,
  error = '',
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [baseline, setBaseline] = useState(null)
  const requestClose = useConfirmDiscard(open && isFormDirty(form, baseline), {
    disabled: processing,
    escapeClose: open ? onClose : null,
  })
  const [coordsError, setCoordsError] = useState('')
  const [coordsFound, setCoordsFound] = useState(false)
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    if (!open) return
    const initialForm = {
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
      coords: formatCoords(villageCoords(initialData)),
      hero_photo_credit: initialData?.hero_photo_credit ?? '',
      welcome_message: initialData?.welcome_message ?? '',
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(initialForm)
    setBaseline(initialForm)
    setCoordsError('')
    setCoordsFound(false)
  }, [open, initialData])

  if (!open) return null

  const busy = processing || resolving

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    if (name === 'coords') {
      setCoordsError('')
      setCoordsFound(false)
    }
  }

  const clearCoords = () => {
    setForm((current) => ({ ...current, coords: '' }))
    setCoordsError('')
    setCoordsFound(false)
  }

  // Link Google Maps -> titik kantor (dibaca backend, termasuk short link).
  // Isian diganti koordinat hasilnya agar terlihat sebelum disimpan.
  // Mengembalikan [lat, lng], atau undefined bila gagal.
  const resolveLink = async () => {
    setResolving(true)
    setCoordsError('')

    try {
      const response = await resolveMapLink(form.coords.trim())
      const { latitude, longitude } = response.data?.data ?? {}
      const coords = parseCoords(`${latitude}, ${longitude}`)

      if (!coords) throw new Error('invalid')

      setForm((current) => ({ ...current, coords: formatCoords(coords) }))
      setCoordsFound(true)

      return coords
    } catch (err) {
      setCoordsError(
        err?.response?.data?.message || 'Gagal mengambil titik dari link. Coba lagi sebentar.',
      )

      return undefined
    } finally {
      setResolving(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.name.trim() || !form.head_name.trim()) {
      return
    }

    // Link yang belum diubah menjadi titik diproses dulu saat menyimpan.
    const coords = isLink(form.coords) ? await resolveLink() : parseCoords(form.coords)

    if (coords === undefined) {
      if (!isLink(form.coords)) setCoordsError(COORDS_FORMAT_ERROR)
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
      latitude: coords?.[0] ?? null,
      longitude: coords?.[1] ?? null,
      hero_photo_credit: form.hero_photo_credit.trim(),
      welcome_message: form.welcome_message.trim(),
    })
  }

  return (
    <div
      className="sid-profil-desa-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !processing) {
          requestClose(onClose)
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
            onClick={() => requestClose(onClose)}
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
              <label htmlFor="profil-welcome">Sambutan Kepala Desa (opsional)</label>

              <textarea
                id="profil-welcome"
                name="welcome_message"
                value={form.welcome_message}
                onChange={handleChange}
                placeholder="Dua sampai tiga kalimat sambutan untuk warga"
                rows={3}
                maxLength={600}
                aria-describedby="profil-welcome-hint"
                disabled={processing}
              />

              <p id="profil-welcome-hint" className="sid-profil-desa-location-hint">
                Tampil di beranda bersama nama Kepala Desa. Kosongkan untuk menyembunyikan blok
                sambutan.
              </p>
            </div>

            <div className="sid-profil-desa-form-field sid-profil-desa-form-field-full">
              <label htmlFor="profil-coords">Lokasi Kantor Desa</label>

              <div className="sid-profil-desa-location-input">
                <input
                  id="profil-coords"
                  name="coords"
                  type="text"
                  value={form.coords}
                  onChange={handleChange}
                  placeholder="Tempel link Google Maps atau koordinat, mis. -7.6803137, 108.5513816"
                  aria-describedby="profil-coords-hint"
                  aria-invalid={coordsError ? 'true' : undefined}
                  disabled={busy}
                />

                {isLink(form.coords) && (
                  <button
                    type="button"
                    className="sid-profil-desa-modal-secondary"
                    onClick={resolveLink}
                    disabled={busy}
                  >
                    {resolving ? 'Mengambil titik...' : 'Ambil titik dari link'}
                  </button>
                )}

                {form.coords && !isLink(form.coords) && (
                  <button
                    type="button"
                    className="sid-profil-desa-modal-secondary"
                    onClick={clearCoords}
                    disabled={busy}
                  >
                    Hapus lokasi
                  </button>
                )}
              </div>

              <p id="profil-coords-hint" className="sid-profil-desa-location-hint">
                Di Google Maps, pilih titik kantor desa → Bagikan → Salin link, lalu tempel di sini.
                Bisa juga menempel koordinatnya langsung. Dipakai untuk tombol &ldquo;Buka di
                peta&rdquo; di beranda.
              </p>

              {coordsFound && (
                <p className="sid-profil-desa-location-hint" role="status">
                  Titik ditemukan. Simpan untuk memakai lokasi ini.
                </p>
              )}

              {coordsError && (
                <p className="sid-form-field-error" role="alert">
                  {coordsError}
                </p>
              )}
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

          {error && (
            <div className="sid-profil-desa-error" role="alert">
              {error}
            </div>
          )}

          <div className="sid-profil-desa-modal-actions">
            <button
              type="button"
              onClick={() => requestClose(onClose)}
              className="sid-profil-desa-modal-secondary"
              disabled={processing}
            >
              Batal
            </button>

            <button
              type="submit"
              className="sid-profil-desa-modal-primary"
              disabled={busy || !form.name.trim() || !form.head_name.trim()}
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
