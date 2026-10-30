import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { ExternalLink, Image as ImageIcon, Pencil } from 'lucide-react'

import { formatCoords, googleMapsUrl, villageCoords } from '@/shared/lib/villageMap'
import { confirmDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'
import ImageFilePicker, { ImagePreviewStage } from '@/components/ui/ImageFilePicker'
import type { Village } from '@/types'
import type { VillageImageKind } from '../types'
import { getApiErrorMessage } from '@/shared/lib/apiError'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

type ImageField = {
  kind: VillageImageKind
  urlKey: 'logo_url' | 'hero_image_url'
  label: string
  hint: string
  maxMb: number
}

type UploadImage = (kind: VillageImageKind, file: File) => Promise<unknown>

// Batas ukuran sama dengan backend (UploadVillageImageRequest).
const IMAGE_FIELDS: ImageField[] = [
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

/**
 * Satu gambar halaman publik. Gambarnya publik, jadi pratinjau memakai URL
 * dari backend langsung (berbeda dengan stempel yang privat).
 */
type PublicImageFieldProps = {
  field: ImageField
  currentUrl: string | null
  onUpload: UploadImage
}

function PublicImageField({ field, currentUrl, onUpload }: PublicImageFieldProps) {
  const [draft, setDraft] = useState<File | null>(null)
  const [draftUrl, setDraftUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inputId = `village-${field.kind}-upload`

  useEffect(
    () => () => {
      if (draftUrl) URL.revokeObjectURL(draftUrl)
    },
    [draftUrl],
  )

  const handleSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null

    event.target.value = ''

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
    if (currentUrl) {
      const confirmed = await confirmDialog({
        title: `Ganti ${field.label.toLowerCase()}?`,
        message: 'Gambar lama diganti dan langsung tampil di halaman publik.',
        confirmLabel: 'Ganti',
        tone: 'primary',
      })

      if (!confirmed) return
    }

    setSaving(true)
    setError('')

    try {
      await onUpload(field.kind, draft)
      setDraft(null)
      setDraftUrl('')
      notifySuccess(`${field.label} berhasil disimpan.`)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, `Gagal menyimpan ${field.label.toLowerCase()}.`))
    } finally {
      setSaving(false)
    }
  }

  const previewUrl = draftUrl || currentUrl

  return (
    <div className="sid-profil-desa-info-item sid-image-field">
      <span className="sid-profil-desa-info-label">{field.label}</span>

      <ImagePreviewStage
        src={previewUrl}
        alt={draft ? `Pratinjau ${field.label.toLowerCase()}` : field.label}
        cover={field.kind === 'hero'}
      />

      {error && (
        <p className="sid-admin-alert sid-admin-alert-error" role="alert">
          {error}
        </p>
      )}

      {draft ? (
        <div className="sid-actions sid-image-field-actions">
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
        <ImageFilePicker
          id={inputId}
          title={previewUrl ? 'Ganti gambar' : 'Pilih gambar'}
          hint={field.hint}
          onChange={handleSelect}
        />
      )}
    </div>
  )
}

/**
 * Logo, foto beranda, jam layanan, link peta, dan kredit foto yang tampil di
 * halaman publik. Teksnya diubah lewat modal Edit Profil Desa.
 */
type TampilanPublikCardProps = {
  // Cukup field tampilan publik yang dibaca kartu ini.
  profile: Partial<
    Pick<
      Village,
      | 'name'
      | 'logo_url'
      | 'hero_image_url'
      | 'office_hours'
      | 'hero_photo_credit'
      | 'welcome_message'
      | 'latitude'
      | 'longitude'
    >
  >
  onUpload: UploadImage
  onEditText: () => void
  disabled?: boolean
}

export default function TampilanPublikCard({
  profile,
  onUpload,
  onEditText,
  disabled,
}: TampilanPublikCardProps) {
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
