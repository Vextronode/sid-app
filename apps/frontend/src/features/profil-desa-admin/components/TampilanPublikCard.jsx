import { useEffect, useState } from 'react'
import { ExternalLink, Image as ImageIcon, Pencil } from 'lucide-react'

import { formatCoords, googleMapsUrl, villageCoords } from '@/shared/lib/villageMap'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

// Batas ukuran sama dengan backend (UploadVillageImageRequest).
const IMAGE_FIELDS = [
  {
    kind: 'logo',
    urlKey: 'logo_url',
    label: 'Logo / Lambang',
    hint: 'Tampil di header dan sidebar. PNG/JPG/WebP, maks. 2 MB.',
    maxMb: 2,
  },
  {
    kind: 'hero',
    urlKey: 'hero_image_url',
    label: 'Foto Beranda',
    hint: 'Foto besar di beranda dan Profil Desa. PNG/JPG/WebP, maks. 5 MB.',
    maxMb: 5,
  },
]

function serverMessage(error, fallback) {
  const errors = error?.response?.data?.errors
  const first = errors && typeof errors === 'object' ? Object.values(errors).flat()[0] : null

  return first ?? error?.response?.data?.message ?? fallback
}

/**
 * Satu gambar halaman publik. Gambarnya publik, jadi pratinjau memakai URL
 * dari backend langsung (berbeda dengan stempel yang privat).
 */
function PublicImageField({ field, currentUrl, onUpload }) {
  const [draft, setDraft] = useState(null)
  const [draftUrl, setDraftUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const inputId = `village-${field.kind}-upload`

  useEffect(
    () => () => {
      if (draftUrl) URL.revokeObjectURL(draftUrl)
    },
    [draftUrl],
  )

  const handleSelect = (event) => {
    const file = event.target.files?.[0] ?? null

    event.target.value = ''
    setSuccess('')

    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Format berkas harus PNG, JPG, atau WebP.')
      return
    }

    if (file.size > field.maxMb * 1024 * 1024) {
      setError(`Ukuran berkas maksimal ${field.maxMb} MB.`)
      return
    }

    setError('')
    setDraft(file)
    setDraftUrl(URL.createObjectURL(file))
  }

  const cancelDraft = () => {
    setDraft(null)
    setDraftUrl('')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      await onUpload(field.kind, draft)
      setDraft(null)
      setDraftUrl('')
      setSuccess(`${field.label} berhasil disimpan.`)
    } catch (requestError) {
      setError(serverMessage(requestError, `Gagal menyimpan ${field.label.toLowerCase()}.`))
    } finally {
      setSaving(false)
    }
  }

  const previewUrl = draftUrl || currentUrl

  return (
    <div className="sid-profil-desa-info-item">
      <span className="sid-profil-desa-info-label">{field.label}</span>

      {previewUrl ? (
        <img
          src={previewUrl}
          alt={draft ? `Pratinjau ${field.label.toLowerCase()}` : field.label}
          className={`sid-public-media-preview sid-public-media-preview--${field.kind}`}
        />
      ) : (
        <p className="sid-profil-desa-info-value">
          <ImageIcon size={14} /> Belum diunggah.
        </p>
      )}

      {error && (
        <p className="sid-form-field-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="sid-upload-description" role="status">
          {success}
        </p>
      )}

      {draft ? (
        <div className="sid-actions">
          <button
            type="button"
            className="sid-btn sid-btn-secondary"
            onClick={cancelDraft}
            disabled={saving}
          >
            Batal
          </button>
          <button
            type="button"
            className="sid-btn sid-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      ) : (
        <>
          <label className="sid-label" htmlFor={inputId}>
            {previewUrl ? 'Ganti gambar' : 'Unggah gambar'}
          </label>
          <input id={inputId} type="file" accept=".png,.jpg,.jpeg,.webp" onChange={handleSelect} />
          <p className="sid-upload-description">{field.hint}</p>
        </>
      )}
    </div>
  )
}

/**
 * Logo, foto beranda, jam layanan, link peta, dan kredit foto yang tampil di
 * halaman publik. Teksnya diubah lewat modal Edit Profil Desa.
 */
export default function TampilanPublikCard({ profile, onUpload, onEditText, disabled }) {
  const mapUrl = googleMapsUrl(profile)

  return (
    <div className="sid-profil-desa-card">
      <div className="sid-profil-desa-perangkat-header">
        <div className="sid-profil-desa-section-heading">
          <div className="sid-profil-desa-section-icon">
            <ImageIcon size={16} />
          </div>

          <div>
            <h3>Tampilan Halaman Publik</h3>
            <p>Logo, foto, dan kontak yang dilihat warga di beranda dan Profil Desa.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onEditText}
          className="sid-profil-desa-inline-edit"
          disabled={disabled}
        >
          <Pencil size={12} />
          Edit Teks
        </button>
      </div>

      <div className="sid-profil-desa-info-grid">
        {IMAGE_FIELDS.map((field) => (
          <PublicImageField
            key={field.kind}
            field={field}
            currentUrl={profile[field.urlKey]}
            onUpload={onUpload}
          />
        ))}

        <div className="sid-profil-desa-info-item">
          <span className="sid-profil-desa-info-label">Jam Layanan Kantor</span>
          <p className="sid-profil-desa-info-value">{profile.office_hours || '-'}</p>
        </div>

        <div className="sid-profil-desa-info-item">
          <span className="sid-profil-desa-info-label">Kredit Foto Beranda</span>
          <p className="sid-profil-desa-info-value">{profile.hero_photo_credit || '-'}</p>
        </div>

        <div className="sid-profil-desa-info-item sid-profil-desa-info-item-full">
          <span className="sid-profil-desa-info-label">Sambutan Kepala Desa</span>
          <p className="sid-profil-desa-info-value">
            {profile.welcome_message || 'Belum diisi (blok sambutan tidak tampil di beranda)'}
          </p>
        </div>

        <div className="sid-profil-desa-info-item sid-profil-desa-info-item-full">
          <span className="sid-profil-desa-info-label">Titik Kantor Desa</span>
          <p className="sid-profil-desa-info-value">
            {mapUrl ? (
              <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                {formatCoords(villageCoords(profile))} <ExternalLink size={12} aria-hidden="true" />
              </a>
            ) : (
              '-'
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
