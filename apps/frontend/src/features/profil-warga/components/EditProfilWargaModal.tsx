/* eslint-disable react-hooks/set-state-in-effect */
// ==========================================
// EditProfilWargaModal.tsx
// Pengaturan akun untuk semua peran: ubah username/email
// (PATCH /api/profile) dan ubah kata sandi (PUT /api/profile/password).
// Data kependudukan (nama, alamat, dst.) tidak diubah dari sini; itu
// dikelola Staf SIDUTama atau lewat surat.
// ==========================================
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import api from '@/lib/api'
import { useConfirmDiscard } from '@/shared/hooks/useConfirmDiscard'
import { notifySuccess } from '@/shared/lib/toast'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import type { User } from '@/types'

type EditProfilWargaModalProps = {
  open: boolean
  onClose: () => void
  onSaved?: (user: User) => void
  initialData: Pick<User, 'username' | 'email'> | null | undefined
}

// Respons PATCH /api/profile dan PUT /api/profile/password.
type ProfileResponse = { data?: { message?: string; user?: User } }

const EMPTY_PASSWORD = { current_password: '', password: '', password_confirmation: '' }

export default function EditProfilWargaModal({
  open,
  onClose,
  onSaved,
  initialData,
}: EditProfilWargaModalProps) {
  const [account, setAccount] = useState({ username: '', email: '' })
  const [password, setPassword] = useState(EMPTY_PASSWORD)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')

  // Username/email berbeda dari data tersimpan, atau kolom kata sandi terisi.
  const accountDirty =
    account.username !== (initialData?.username ?? '') ||
    account.email !== (initialData?.email ?? '')
  const passwordDirty = Object.values(password).some((value) => value !== '')
  const requestClose = useConfirmDiscard(open && (accountDirty || passwordDirty), {
    disabled: Boolean(saving),
    escapeClose: open ? onClose : null,
  })

  useEffect(() => {
    if (!open) return

    setAccount({
      username: initialData?.username ?? '',
      email: initialData?.email ?? '',
    })
    setPassword(EMPTY_PASSWORD)
    setError('')
  }, [open, initialData])

  if (!open) return null

  const submit = async (
    kind: 'account' | 'password',
    request: () => Promise<ProfileResponse>,
    successMessage: string,
  ) => {
    setSaving(kind)
    setError('')

    try {
      const response = await request()

      notifySuccess(response.data?.message ?? successMessage)

      if (response.data?.user) onSaved?.(response.data.user)

      return true
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Perubahan gagal disimpan.'))

      return false
    } finally {
      setSaving('')
    }
  }

  const handleAccountSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    return submit(
      'account',
      () =>
        api.patch('/api/profile', {
          username: account.username.trim().toLowerCase(),
          email: account.email.trim() || null,
        }),
      'Profil berhasil diperbarui.',
    )
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (password.password !== password.password_confirmation) {
      setError('Konfirmasi kata sandi tidak sama.')

      return
    }

    const saved = await submit(
      'password',
      () => api.put('/api/profile/password', password),
      'Kata sandi berhasil diperbarui.',
    )

    if (saved) setPassword(EMPTY_PASSWORD)
  }

  return (
    <div className="sid-modal-overlay">
      <div className="sid-modal sid-edit-profil-warga-modal">
        <div className="sid-modal-header">
          <h2>Pengaturan Akun</h2>
        </div>

        {error && (
          <div className="sid-modal-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleAccountSubmit}>
          <div className="sid-modal-field sid-profile-field">
            <label htmlFor="account-username">Username</label>
            <input
              id="account-username"
              value={account.username}
              onChange={(event) => setAccount({ ...account, username: event.target.value })}
              className="sid-input"
              minLength={4}
              maxLength={30}
              pattern="[a-z0-9_.]{4,30}"
              title="4-30 karakter: huruf kecil, angka, titik, atau garis bawah"
              autoComplete="username"
              required
            />
            <small>4–30 karakter: huruf kecil, angka, titik, atau garis bawah.</small>
          </div>

          <div className="sid-modal-field sid-profile-field">
            <label htmlFor="account-email">Email (opsional)</label>
            <input
              id="account-email"
              type="email"
              value={account.email}
              onChange={(event) => setAccount({ ...account, email: event.target.value })}
              className="sid-input"
              autoComplete="email"
            />
          </div>

          <div className="sid-modal-actions">
            <button type="submit" className="sid-btn sid-btn-primary" disabled={saving !== ''}>
              {saving === 'account' ? 'Menyimpan...' : 'Simpan Username & Email'}
            </button>
          </div>
        </form>

        <form onSubmit={handlePasswordSubmit}>
          <div className="sid-modal-field sid-profile-field">
            <label htmlFor="account-current-password">Kata sandi saat ini</label>
            <input
              id="account-current-password"
              type="password"
              value={password.current_password}
              onChange={(event) =>
                setPassword({ ...password, current_password: event.target.value })
              }
              className="sid-input"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="sid-modal-field sid-profile-field">
            <label htmlFor="account-new-password">Kata sandi baru</label>
            <input
              id="account-new-password"
              type="password"
              value={password.password}
              onChange={(event) => setPassword({ ...password, password: event.target.value })}
              className="sid-input"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="sid-modal-field sid-profile-field">
            <label htmlFor="account-password-confirmation">Ulangi kata sandi baru</label>
            <input
              id="account-password-confirmation"
              type="password"
              value={password.password_confirmation}
              onChange={(event) =>
                setPassword({ ...password, password_confirmation: event.target.value })
              }
              className="sid-input"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="sid-modal-actions">
            <button
              type="button"
              className="sid-btn sid-btn-secondary"
              onClick={() => requestClose(onClose)}
            >
              Tutup
            </button>
            <button type="submit" className="sid-btn sid-btn-primary" disabled={saving !== ''}>
              {saving === 'password' ? 'Menyimpan...' : 'Ubah Kata Sandi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
