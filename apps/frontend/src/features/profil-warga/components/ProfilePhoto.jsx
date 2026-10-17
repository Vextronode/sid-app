import { useRef, useState } from 'react'
import { Camera, Trash2, User } from 'lucide-react'

import { useAuth } from '@/features/auth/contexts/AuthContext'
import { userPhotoUrl } from '@/features/auth/utils/userPhoto'
import { deleteOwnPhoto, uploadOwnPhoto } from '../api'
import { STAF_APP_LABEL } from '@/lib/constants/app'

const PHOTO_TYPES = 'image/png,image/jpeg,image/webp'

const errorMessage = (error, fallback) => {
  const errors = error?.response?.data?.errors
  return (errors && Object.values(errors).flat()[0]) || error?.response?.data?.message || fallback
}

/**
 * Foto profil di kepala halaman Profil.
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

  const isWarga = user?.role === 'warga'
  const src = userPhotoUrl(user)

  const run = async (request, fallback) => {
    setBusy(true)
    setError('')
    try {
      const response = await request()
      patchUser({ photo_url: response?.data?.data?.photo_url ?? null })
    } catch (requestError) {
      setError(errorMessage(requestError, fallback))
    } finally {
      setBusy(false)
    }
  }

  const handleFile = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) run(() => uploadOwnPhoto(file), 'Gagal mengunggah foto.')
  }

  const handleDelete = () => {
    if (!window.confirm('Hapus foto profil?')) return
    run(deleteOwnPhoto, 'Gagal menghapus foto.')
  }

  return (
    <div className="sid-profile-photo">
      <div className={avatarClassName}>
        {src ? (
          <img
            src={src}
            alt={`Foto ${user?.name ?? 'profil'}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <User size={24} />
        )}
      </div>

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
