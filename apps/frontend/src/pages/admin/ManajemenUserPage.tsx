// ==========================================
// ManajemenUserPage.tsx
// Halaman kelola user & role.
// Layout disamakan dengan OperatorSuratListPage.
// Logic/API tidak diubah.
// ==========================================

import { useRef, useState } from 'react'
import {
  Search,
  SquarePen,
  Eye,
  EyeOff,
  Eraser,
  KeyRound,
  Camera,
  ImageOff,
  User as UserIcon,
} from 'lucide-react'

import { useUserList } from '@/features/manajemen-user/hooks/useUserList'
import { deleteUserPhoto, resetUserPassword, uploadUserPhoto } from '@/features/manajemen-user/api'
import { resetUserSignature } from '@/features/surat/api/signatureApi'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { PageNumbers } from '@/components/ui/PageNumbers'
import { PageSizeSelect } from '@/components/ui/PageSizeSelect'
import { formatPageRange } from '@/components/ui/pageRange'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { StatusPill } from '@/components/ui/StatusPill'
import { confirmDialog, promptDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'
import { useConfirmDiscard } from '@/shared/hooks/useConfirmDiscard'
import type { ChangeEvent, FormEvent } from 'react'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import type { User } from '@/types'

export default function ManajemenUserPage() {
  const {
    data,
    loading,
    error,
    reload,
    setSearch,
    filterStatus,
    setFilterStatus,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    pageSize,
    setPageSize,
    toggleStatus,
    updateUser,
    patchUser,
  } = useUserList()

  const [keyword, setKeyword] = useState('')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState('')
  const [signatureNotice, setSignatureNotice] = useState<{ type: 'error'; text: string } | null>(
    null,
  )

  // Reset darurat tanda tangan akun. Tanda tangan lama tetap tersimpan
  // untuk dokumen yang sudah terbit; pemilik akun dapat mengisi yang baru.
  const handleResetSignature = async (user: User) => {
    const reason = await promptDialog({
      title: `Atur ulang tanda tangan ${user.name}?`,
      message: 'Tanda tangan lama tetap tersimpan untuk dokumen yang sudah terbit.',
      label: 'Alasan atur ulang (minimal 5 karakter)',
      minLength: 5,
      confirmLabel: 'Atur ulang tanda tangan',
    })

    if (reason === null) return

    try {
      const response = await resetUserSignature(user.id, reason.trim())

      setSignatureNotice(null)
      notifySuccess(response.data?.message ?? 'Tanda tangan berhasil diatur ulang.')
    } catch (requestError) {
      const text = getApiErrorMessage(requestError, 'Gagal mengatur ulang tanda tangan.')

      setSignatureNotice({ type: 'error', text })
    }
  }

  const handleToggleStatus = async (user: User) => {
    const deactivating = user.is_active
    const confirmed = await confirmDialog(
      deactivating
        ? {
            title: `Nonaktifkan akun ${user.name}?`,
            message: 'Pengguna tidak dapat masuk ke aplikasi sampai akunnya diaktifkan kembali.',
            confirmLabel: 'Nonaktifkan',
          }
        : {
            title: `Aktifkan akun ${user.name}?`,
            message: 'Pengguna dapat masuk kembali ke aplikasi.',
            confirmLabel: 'Aktifkan',
            tone: 'primary',
          },
    )

    if (!confirmed) return

    if (await toggleStatus(user.id)) {
      notifySuccess(`Akun ${user.name} berhasil ${deactivating ? 'dinonaktifkan' : 'diaktifkan'}.`)
    }
  }

  // Reset kata sandi: backend membuat kata sandi sementara yang hanya
  // ditampilkan sekali di sini untuk diserahkan langsung ke pengguna.
  const [passwordReset, setPasswordReset] = useState<{ user: User; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleResetPassword = async (user: User) => {
    const confirmed = await confirmDialog({
      title: `Atur ulang kata sandi ${user.name}?`,
      message: 'Kata sandi lama tidak dapat dipakai lagi.',
      confirmLabel: 'Atur ulang kata sandi',
    })

    if (!confirmed) return

    try {
      const response = await resetUserPassword(user.id)

      setCopied(false)
      setPasswordReset({ user, password: response.data?.temporary_password ?? '' })
    } catch (requestError) {
      setSignatureNotice({
        type: 'error',
        text: requestError?.response?.data?.message || 'Gagal mengatur ulang kata sandi.',
      })
    }
  }

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(passwordReset.password)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  // Foto profil akun warga. Satu input berkas tersembunyi dipakai bersama;
  // akun yang dituju disimpan di ref. Foto akun yang menjabat diatur di
  // halaman Pejabat Desa.
  const photoInput = useRef<HTMLInputElement>(null)
  const photoTarget = useRef<User | null>(null)

  const runPhoto = async (
    request: () => Promise<{ data?: { data?: { photo_url?: string | null } } }>,
    user: User,
    successText: string,
    fallback: string,
  ) => {
    try {
      const response = await request()

      patchUser(user.id, { photo_url: response.data?.data?.photo_url ?? null })
      setSignatureNotice(null)
      notifySuccess(successText)
    } catch (requestError) {
      const text = getApiErrorMessage(requestError, fallback)

      setSignatureNotice({ type: 'error', text })
    }
  }

  const pickPhotoFor = (user: User) => {
    photoTarget.current = user
    photoInput.current?.click()
  }

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const user = photoTarget.current

    event.target.value = ''
    if (!file || !user) return

    runPhoto(
      () => uploadUserPhoto(user.id, file),
      user,
      `Foto profil ${user.name} berhasil disimpan.`,
      'Gagal mengunggah foto.',
    )
  }

  const handleDeletePhoto = async (user: User) => {
    if (
      !(await confirmDialog({
        title: `Hapus foto profil ${user.name}?`,
        message: 'Tindakan ini tidak dapat dibatalkan.',
        confirmLabel: 'Hapus',
      }))
    )
      return

    runPhoto(
      () => deleteUserPhoto(user.id),
      user,
      `Foto profil ${user.name} berhasil dihapus.`,
      'Gagal menghapus foto.',
    )
  }

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSearch(keyword)
  }

  const closeEdit = () => setEditingUser(null)
  const requestCloseEdit = useConfirmDiscard(
    Boolean(editingUser) && editName !== (editingUser?.name ?? ''),
    { escapeClose: editingUser ? closeEdit : null },
  )

  const handleOpenEdit = (user: User) => {
    setEditingUser(user)
    setEditName(user.name ?? '')
    setEditError('')
  }

  const handleSubmitName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingUser) return
    setEditError('')
    try {
      await updateUser(editingUser.id, editName)
      notifySuccess('Nama pengguna berhasil diperbarui.')
      setEditingUser(null)
    } catch (err) {
      setEditError(err?.response?.data?.message || 'Gagal memperbarui nama pengguna.')
    }
  }

  return (
    <div className="sid-operator-page sid-admin-users-page">
      <div className="sid-operator-content">
        {/* Breadcrumb */}
        <p className="sid-operator-breadcrumb">
          Admin / <span>Manajemen Pengguna</span>
        </p>

        {/* Header */}
        <div className="sid-operator-header">
          <h1>Manajemen Pengguna</h1>
          <RefreshButton onRefresh={reload} />
        </div>

        <input
          ref={photoInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          aria-label="Unggah foto pengguna"
          onChange={handlePhotoChange}
        />

        {/* Search & Filter */}
        <div className="sid-operator-filter-card">
          <form onSubmit={handleSearchSubmit} className="sid-operator-filter-grid user-filter">
            {/* Search */}
            <div className="sid-operator-filter-field">
              <p>Pencarian Cepat</p>

              <div className="sid-operator-search">
                <Search size={16} />

                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Cari nama atau email..."
                />
              </div>
            </div>

            {/* Status */}
            <div className="sid-operator-filter-field">
              <p>Status</p>

              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">Semua Status</option>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
            </div>
          </form>
        </div>

        {/* Table */}
        {signatureNotice && (
          <p
            className={`sid-admin-alert ${
              signatureNotice.type === 'error' ? 'sid-admin-alert-error' : 'sid-admin-alert-success'
            }`}
            role={signatureNotice.type === 'error' ? 'alert' : 'status'}
          >
            {signatureNotice.text}
          </p>
        )}

        <div className="sid-operator-table-card">
          <div className="sid-operator-table-wrapper">
            <table className="sid-operator-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th className="center">Email</th>
                  <th className="center">Jabatan</th>
                  <th className="center">Wilayah</th>
                  <th className="center">Status</th>
                  <th className="center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="empty">
                      Memuat data...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="empty" role="alert">
                      {error}
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty">
                      Belum ada data pengguna.
                    </td>
                  </tr>
                ) : (
                  data.map((user) => (
                    <tr key={user.id}>
                      {/* Nama */}
                      <td className="primary-text">
                        <div className="flex items-center gap-3">
                          <div className="sid-profil-desa-avatar sid-profil-desa-avatar-tiny">
                            {user.photo_url ? (
                              <img
                                src={user.photo_url}
                                alt={`Foto ${user.name}`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <UserIcon size={18} className="sid-profil-desa-avatar-placeholder" />
                            )}
                          </div>
                          {user.name}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="center">{user.email}</td>

                      {/* Jabatan */}
                      <td className="center">
                        <span className="sid-operator-role">{user.role_label ?? user.role}</span>
                      </td>

                      {/* Wilayah */}
                      <td className="center">
                        RT {user.citizen?.rt?.number ?? '-'}
                        {' / '}
                        RW {user.citizen?.rw?.number ?? '-'}
                      </td>

                      {/* Status */}
                      <td className="center">
                        <StatusPill active={user.is_active}>
                          {user.is_active ? 'Aktif' : 'Nonaktif'}
                        </StatusPill>
                      </td>

                      {/* Aksi */}
                      <td className="center">
                        <div className="sid-operator-actions">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            className="sid-operator-action edit"
                            title="Ubah nama"
                          >
                            <SquarePen size={16} />
                          </button>

                          {/* Foto akun pejabat diatur di halaman Pejabat Desa. */}
                          {user.role === 'warga' && (
                            <>
                              <button
                                type="button"
                                onClick={() => pickPhotoFor(user)}
                                className="sid-operator-action detail"
                                title={user.photo_url ? 'Ganti foto' : 'Unggah foto'}
                                aria-label={`${user.photo_url ? 'Ganti' : 'Unggah'} foto ${user.name}`}
                              >
                                <Camera size={16} />
                              </button>
                              {user.photo_url && (
                                <button
                                  type="button"
                                  onClick={() => handleDeletePhoto(user)}
                                  className="sid-operator-action delete"
                                  title="Hapus foto"
                                  aria-label={`Hapus foto ${user.name}`}
                                >
                                  <ImageOff size={16} />
                                </button>
                              )}
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            className="sid-operator-action toggle"
                            title={user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          >
                            {user.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleResetSignature(user)}
                            className="sid-operator-action edit"
                            title="Atur ulang tanda tangan"
                            aria-label={`Atur ulang tanda tangan ${user.name}`}
                          >
                            <Eraser size={16} />
                          </button>

                          {/* Backend menolak reset kata sandi sesama Staf SIDUTama. */}
                          {user.role !== 'staf_sid' && (
                            <button
                              type="button"
                              onClick={() => handleResetPassword(user)}
                              className="sid-operator-action edit"
                              title="Atur ulang kata sandi"
                              aria-label={`Atur ulang kata sandi ${user.name}`}
                            >
                              <KeyRound size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="sid-operator-pagination">
            <div className="sid-pagination-meta">
              <p>{formatPageRange(currentPage, pageSize, totalItems, 'pengguna')}</p>
              <PageSizeSelect value={pageSize} onChange={setPageSize} />
            </div>

            <div>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Sebelumnya
              </button>

              <PageNumbers
                currentPage={currentPage}
                totalPages={totalPages}
                onChange={setCurrentPage}
              />

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />

      {passwordReset && (
        <div className="sid-modal-overlay">
          <div className="sid-modal" role="dialog" aria-labelledby="password-reset-heading">
            <h2 id="password-reset-heading">Kata Sandi Sementara</h2>
            <p>
              Berikan kata sandi ini kepada <strong>{passwordReset.user.name}</strong> secara
              langsung. Kata sandi hanya ditampilkan sekali, dan pengguna wajib menggantinya saat
              masuk.
            </p>
            <label className="sid-form-group">
              <span className="sid-form-label">Kata sandi sementara</span>
              <input
                className="sid-input"
                readOnly
                value={passwordReset.password}
                onFocus={(event) => event.target.select()}
              />
            </label>
            <div className="sid-modal-actions">
              <button
                type="button"
                className="sid-button sid-button-outline"
                onClick={handleCopyPassword}
              >
                {copied ? 'Tersalin' : 'Salin'}
              </button>
              <button
                type="button"
                className="sid-button sid-button-primary"
                onClick={() => setPasswordReset(null)}
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="sid-modal-overlay">
          <form className="sid-modal" onSubmit={handleSubmitName}>
            <h2>Ubah Nama Pengguna</h2>
            <label className="sid-form-group">
              <span className="sid-form-label">Nama *</span>
              <input
                className="sid-input"
                required
                maxLength={255}
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
              />
            </label>
            {editError && (
              <p className="sid-admin-alert sid-admin-alert-error" role="alert">
                {editError}
              </p>
            )}
            <div className="sid-modal-actions">
              <button
                type="button"
                className="sid-button sid-button-outline"
                onClick={() => requestCloseEdit(closeEdit)}
              >
                Batal
              </button>
              <button type="submit" className="sid-button sid-button-primary">
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
