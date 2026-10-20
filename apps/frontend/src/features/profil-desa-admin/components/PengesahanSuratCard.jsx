import { useCallback, useEffect, useState } from 'react'
import { Stamp } from 'lucide-react'

import {
  getOfficialSignatureImage,
  getPerangkatDesa,
  getProfilDesa,
  getVillageStampImage,
  uploadOfficialSignature,
  uploadVillageStamp,
} from '../api'
import { confirmDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024

function serverMessage(error, fallback) {
  const errors = error?.response?.data?.errors

  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat()[0]

    if (first) return first
  }

  return error?.response?.data?.message ?? fallback
}

/**
 * Satu berkas pengesahan (stempel atau tanda tangan). Gambar tersimpan
 * privat di server, jadi pratinjau diambil sebagai blob.
 */
function PrivateImageField({ id, label, hasImage, loadImage, upload, onUploaded }) {
  const [imageUrl, setImageUrl] = useState('')
  const [draft, setDraft] = useState(null)
  const [draftUrl, setDraftUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hasImage) return undefined

    let active = true
    let objectUrl = ''

    loadImage()
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)

        if (active) setImageUrl(objectUrl)
      })
      .catch((requestError) => {
        if (active) setError(serverMessage(requestError, `Gagal memuat ${label.toLowerCase()}.`))
      })

    return () => {
      active = false

      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [hasImage, loadImage, label])

  useEffect(
    () => () => {
      if (draftUrl) URL.revokeObjectURL(draftUrl)
    },
    [draftUrl],
  )

  const handleSelect = (event) => {
    const file = event.target.files?.[0] ?? null

    event.target.value = ''

    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Format berkas harus PNG, JPG, atau WebP.')
      return
    }

    if (file.size > MAX_SIZE) {
      setError('Ukuran berkas maksimal 5 MB.')
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
    // Mengganti gambar yang sudah ada memengaruhi semua surat yang terbit sesudahnya.
    if (hasImage || imageUrl) {
      const confirmed = await confirmDialog({
        title: `Ganti ${label.toLowerCase()}?`,
        message: 'Surat yang terbit setelah ini akan memakai gambar baru.',
        confirmLabel: 'Ganti',
        tone: 'primary',
      })

      if (!confirmed) return
    }

    setSaving(true)
    setError('')

    try {
      await upload(draft)

      // Pratinjau dipertahankan dari berkas yang baru diunggah.
      setImageUrl(draftUrl)
      setDraft(null)
      setDraftUrl('')
      notifySuccess(`${label} berhasil disimpan.`)
      onUploaded?.()
    } catch (requestError) {
      setError(serverMessage(requestError, `Gagal menyimpan ${label.toLowerCase()}.`))
    } finally {
      setSaving(false)
    }
  }

  const previewUrl = draftUrl || imageUrl

  return (
    <div className="sid-profil-desa-info-item">
      <span className="sid-profil-desa-info-label">{label}</span>

      {previewUrl ? (
        <img
          src={previewUrl}
          alt={draft ? `Pratinjau ${label.toLowerCase()}` : label}
          style={{ maxHeight: 140, maxWidth: '100%', background: '#fff' }}
        />
      ) : (
        <p className="sid-profil-desa-info-value">{hasImage ? 'Memuat...' : 'Belum diunggah.'}</p>
      )}

      {error && (
        <p className="sid-admin-alert sid-admin-alert-error" role="alert">
          {error}
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
          <label className="sid-label" htmlFor={id}>
            {hasImage || imageUrl ? 'Ganti gambar' : 'Unggah gambar'} (PNG/JPG/WebP, maks. 5 MB)
          </label>
          <input id={id} type="file" accept=".png,.jpg,.jpeg,.webp" onChange={handleSelect} />
        </>
      )}
    </div>
  )
}

/**
 * Stempel desa dan tanda tangan Kepala Desa yang dibubuhkan pada PDF surat.
 * Tanda tangan melekat pada record Kepala Desa yang sedang menjabat; setelah
 * rotasi Kades, tanda tangan pejabat baru perlu diunggah lagi.
 */
export default function PengesahanSuratCard() {
  const [state, setState] = useState({ loading: true, hasStamp: false, kepalaDesa: null })
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    Promise.all([getProfilDesa(), getPerangkatDesa()])
      .then(([profileResponse, officialResponse]) => {
        if (!active) return

        const officials = officialResponse?.data?.data ?? []

        setState({
          loading: false,
          hasStamp: Boolean(profileResponse?.data?.data?.has_stamp_img),
          kepalaDesa:
            officials.find(
              (official) =>
                official.position === 'kepala_desa' && official.is_active && !official.ended_at,
            ) ?? null,
        })
      })
      .catch((requestError) => {
        if (!active) return

        setError(serverMessage(requestError, 'Gagal memuat data pengesahan surat.'))
        setState((current) => ({ ...current, loading: false }))
      })

    return () => {
      active = false
    }
  }, [])

  const kepalaDesaId = state.kepalaDesa?.id ?? null

  const loadSignature = useCallback(() => getOfficialSignatureImage(kepalaDesaId), [kepalaDesaId])
  const uploadSignature = useCallback(
    (file) => uploadOfficialSignature(kepalaDesaId, file),
    [kepalaDesaId],
  )

  return (
    <div className="sid-profil-desa-card">
      <div className="sid-profil-desa-card-heading">
        <div className="sid-profil-desa-section-heading">
          <div className="sid-profil-desa-section-icon">
            <Stamp size={16} />
          </div>

          <div>
            <h3>Pengesahan Surat</h3>
            <p>Stempel desa dan tanda tangan Kepala Desa yang dibubuhkan pada surat terbit.</p>
          </div>
        </div>
      </div>

      {error && <div className="sid-profil-desa-error">{error}</div>}

      {state.loading ? (
        <p className="sid-profil-desa-info-value">Memuat...</p>
      ) : (
        <div className="sid-profil-desa-info-grid">
          <PrivateImageField
            id="village-stamp-upload"
            label="Stempel Desa"
            hasImage={state.hasStamp}
            loadImage={getVillageStampImage}
            upload={uploadVillageStamp}
          />

          {state.kepalaDesa ? (
            <PrivateImageField
              key={kepalaDesaId}
              id="kades-signature-upload"
              label={`Tanda Tangan Kepala Desa (${state.kepalaDesa.citizen?.name ?? '-'})`}
              hasImage={Boolean(state.kepalaDesa.has_signature_img)}
              loadImage={loadSignature}
              upload={uploadSignature}
            />
          ) : (
            <div className="sid-profil-desa-info-item">
              <span className="sid-profil-desa-info-label">Tanda Tangan Kepala Desa</span>
              <p className="sid-profil-desa-info-value">
                Belum ada Kepala Desa yang sedang menjabat. Tetapkan dulu di menu Pejabat Desa.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
