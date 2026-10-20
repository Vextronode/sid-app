import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, Trash2, User, X } from 'lucide-react'

import { useAuth } from '@/features/auth/contexts/AuthContext'
import { userPhotoUrl } from '@/features/auth/utils/userPhoto'
import { deleteOwnPhoto, uploadOwnPhoto } from '../api'
import { STAF_APP_LABEL } from '@/lib/constants/app'
import { confirmDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'

const PHOTO_TYPES = 'image/png,image/jpeg,image/webp'

const errorMessage = (error, fallback) => {
  const errors = error?.response?.data?.errors
  return (errors && Object.values(errors).flat()[0]) || error?.response?.data?.message || fallback
}

/**
 * Pratinjau foto ukuran besar. Ditutup lewat tombol X di pojok kanan atas
 * bingkai, klik di luar bingkai, atau tombol Escape.
 */
function PhotoPreview({ src, alt, onClose }) {
  const closeButton = useRef(null)

  useEffect(() => {
    closeButton.current?.focus()

    const handleKey = (event) => {
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
 * Foto profil di kepala halaman Profil. Bila ada foto, mengekliknya membuka
 * pratinjau ukuran besar.
 *
 * Akun warga: foto akun, bisa diunggah, diganti, dan dihapus sendiri.
 * Akun yang menjabat: foto pejabat (official.photo_img), hanya tampil;
 * yang mengubahnya Petugas Desa lewat halaman Pejabat Desa.
 */
export function ProfilePhoto({ avatarClassName }) {
  const { user, patchUser } = useAuth()
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const closePreview = useCallback(() => setPreviewOpen(false), [])

  const isWarga = user?.role === 'warga'
  const src = userPhotoUrl(user)
  const alt = `Foto ${user?.name ?? 'profil'}`

  const run = async (request, fallback, successMessage) => {
    setBusy(true)
    setError('')
    try {
      const response = await request()
      patchUser({ photo_url: response?.data?.data?.photo_url ?? null })
      notifySuccess(successMessage)
    } catch (requestError) {
      setError(errorMessage(requestError, fallback))
    } finally {
      setBusy(false)
    }
  }

  const handleFile = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file)
      run(() => uploadOwnPhoto(file), 'Gagal mengunggah foto.', 'Foto profil berhasil diperbarui.')
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
    run(deleteOwnPhoto, 'Gagal menghapus foto.', 'Foto profil berhasil dihapus.')
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
        <div className="sid-profile-photo-actions">
          <input
            ref={input}
            type="file"
            accept={PHOTO_TYPES}
            hidden
            aria-label="Pilih foto profil"
            onChange={handleFile}
          />
          <button type="button" disabled={busy} onClick={() => input.current?.click()}>
            <Camera size={13} />
            {busy ? 'Memproses...' : src ? 'Ganti foto' : 'Unggah foto'}
          </button>
          {src && (
            <button type="button" disabled={busy} onClick={handleDelete}>
              <Trash2 size={13} />
              Hapus
            </button>
          )}
        </div>
      ) : (
        <p className="sid-profile-photo-note">Foto jabatan diatur {STAF_APP_LABEL}</p>
      )}

      {error && (
        <p className="sid-form-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
