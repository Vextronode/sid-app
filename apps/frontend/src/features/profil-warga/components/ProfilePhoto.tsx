import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, Trash2, User, X } from 'lucide-react'

import { CameraCapture } from '@/features/auth/components/CameraCapture'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { userPhotoUrl } from '@/features/auth/utils/userPhoto'
import { deleteOwnPhoto, getOwnPhotoRequest, submitPhotoRequest } from '../api'
import type { OwnPhotoRequest } from '../api'
import { STAF_APP_LABEL } from '@/lib/constants/app'
import { confirmDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'
import { getApiErrorMessage } from '@/shared/lib/apiError'

/**
 * Pratinjau foto ukuran besar. Ditutup lewat tombol X di pojok kanan atas
 * bingkai, klik di luar bingkai, atau tombol Escape.
 */
function PhotoPreview({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButton.current?.focus()

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return createPortal(
    <div className="sid-modal-overlay" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pratinjau foto profil"
        className="sid-photo-preview"
        onClick={(event) => event.stopPropagation()}
      >
        <img src={src} alt={alt} className="sid-photo-preview-image" />
        <button
          ref={closeButton}
          type="button"
          className="sid-photo-preview-close"
          aria-label="Tutup pratinjau foto"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
    </div>,
    document.body,
  )
}

/**
 * Ambil foto dari kamera lalu kirim sebagai permintaan ganti foto profil.
 */
function PhotoRequestDialog({
  busy,
  onCancel,
  onSubmit,
}: {
  busy: boolean
  onCancel: () => void
  onSubmit: (photo: Blob) => void
}) {
  const [photo, setPhoto] = useState<Blob | null>(null)

  return createPortal(
    <div className="sid-modal-overlay">
      <div
        className="sid-modal sid-photo-request-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-request-heading"
      >
        <div className="sid-dialog-heading">
          <h2 id="photo-request-heading">Ganti Foto Profil</h2>
          <p>
            Foto baru terpasang setelah disetujui petugas wilayah (RT, RW, Kepala Dusun, atau{' '}
            {STAF_APP_LABEL}).
          </p>
        </div>

        <CameraCapture photo={photo} onChange={setPhoto} />

        <div className="sid-modal-actions">
          <button type="button" className="sid-button sid-button-outline" onClick={onCancel}>
            Batal
          </button>
          <button
            type="button"
            className="sid-button sid-button-primary"
            disabled={!photo || busy}
            onClick={() => photo && onSubmit(photo)}
          >
            {busy ? 'Mengirim...' : 'Kirim permintaan'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/**
 * Foto profil di kepala halaman Profil. Bila ada foto, mengekliknya membuka
 * pratinjau ukuran besar.
 *
 * Akun warga: ganti foto lewat permintaan dari kamera yang disetujui petugas
 * wilayah; hapus foto langsung. Akun yang menjabat: foto pejabat
 * (official.photo_img), hanya tampil; yang mengubahnya Staf SIDUTama lewat
 * halaman Pejabat Desa.
 */
export function ProfilePhoto({ avatarClassName }: { avatarClassName?: string }) {
  const { user, patchUser } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [request, setRequest] = useState<OwnPhotoRequest | null>(null)
  const closePreview = useCallback(() => setPreviewOpen(false), [])

  const isWarga = user?.role === 'warga'
  const src = userPhotoUrl(user)
  const alt = `Foto ${user?.name ?? 'profil'}`
  const pending = request?.status === 'pending'

  const loadRequest = useCallback(async () => {
    try {
      setRequest(await getOwnPhotoRequest())
    } catch {
      // Status permintaan hanya pelengkap; tombol tetap bisa dipakai.
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isWarga) void loadRequest()
  }, [isWarga, loadRequest])

  const sendRequest = async (photo: Blob) => {
    setBusy(true)
    setError('')
    try {
      const response = await submitPhotoRequest(photo)
      notifySuccess(response.data?.message ?? 'Permintaan ganti foto terkirim.')
      setCameraOpen(false)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal mengirim permintaan ganti foto.'))
      setCameraOpen(false)
    } finally {
      setBusy(false)
      await loadRequest()
    }
  }

  const handleDelete = async () => {
    if (
      !(await confirmDialog({
        title: 'Hapus foto profil?',
        message: 'Foto akan dihapus dan diganti avatar bawaan.',
        confirmLabel: 'Hapus',
      }))
    )
      return

    setBusy(true)
    setError('')
    try {
      const response = await deleteOwnPhoto()
      patchUser({ photo_url: response?.data?.data?.photo_url ?? null })
      notifySuccess('Foto profil berhasil dihapus.')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal menghapus foto.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sid-profile-photo">
      {src ? (
        <button
          type="button"
          className={`${avatarClassName} sid-profile-photo-trigger`}
          aria-label="Lihat foto profil"
          onClick={() => setPreviewOpen(true)}
        >
          <img src={src} alt={alt} className="h-full w-full object-cover" />
        </button>
      ) : (
        <div className={avatarClassName}>
          <User size={24} />
        </div>
      )}

      {previewOpen && src && <PhotoPreview src={src} alt={alt} onClose={closePreview} />}

      {isWarga ? (
        <>
          <div className="sid-profile-photo-actions">
            <button type="button" disabled={busy || pending} onClick={() => setCameraOpen(true)}>
              <Camera size={13} />
              {src ? 'Ganti foto' : 'Unggah foto'}
            </button>
            {src && (
              <button type="button" disabled={busy} onClick={handleDelete}>
                <Trash2 size={13} />
                Hapus
              </button>
            )}
          </div>

          {pending && (
            <p className="sid-profile-photo-note">Foto baru menunggu persetujuan petugas</p>
          )}
          {request?.status === 'rejected' && (
            <p className="sid-form-field-error" role="status">
              Ganti foto ditolak: {request.decision_notes}
            </p>
          )}
        </>
      ) : (
        <p className="sid-profile-photo-note">Foto jabatan diatur {STAF_APP_LABEL}</p>
      )}

      {cameraOpen && (
        <PhotoRequestDialog
          busy={busy}
          onCancel={() => setCameraOpen(false)}
          onSubmit={(photo) => void sendRequest(photo)}
        />
      )}

      {error && (
        <p className="sid-form-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
