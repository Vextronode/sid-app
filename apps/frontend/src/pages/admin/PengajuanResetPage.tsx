import { Check, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { SiteFooter } from '@/components/layout/SiteFooter'
import { PageLoader } from '@/components/ui/PageLoader'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { PageNumbers } from '@/components/ui/PageNumbers'
import { PageSizeSelect } from '@/components/ui/PageSizeSelect'
import { formatPageRange } from '@/components/ui/pageRange'
import { StatusPill } from '@/components/ui/StatusPill'
import { usePageSize } from '@/components/ui/usePageSize'
import {
  approvePasswordResetRequest,
  getPasswordResetRequests,
  rejectPasswordResetRequest,
} from '@/features/manajemen-user/api/passwordResetApi'
import { confirmDialog, promptDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import type { StatusTone } from '@/components/ui/StatusPill'
import type { PasswordResetRequest } from '@/features/manajemen-user/api/passwordResetApi'
import type { PageMeta } from '@/types'

const PASSWORD_STATUS: Record<string, { tone: StatusTone; label: string }> = {
  pending: { tone: 'warning', label: 'Menunggu' },
  approved: { tone: 'active', label: 'Disetujui' },
  rejected: { tone: 'danger', label: 'Ditolak' },
  completed: { tone: 'active', label: 'Selesai' },
  cancelled: { tone: 'inactive', label: 'Dibatalkan' },
  expired: { tone: 'danger', label: 'Kedaluwarsa' },
}

const EMPTY_META: Pick<PageMeta, 'current_page' | 'last_page' | 'total'> = {
  current_page: 1,
  last_page: 1,
  total: 0,
}

function formatDateTime(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-'
}

/**
 * Pengajuan reset kata sandi dari pemilik akun beserta riwayatnya: yang
 * menunggu di atas, lalu yang sudah diputuskan dari yang terbaru. (Tidak
 * ada lagi reset tanda tangan: surat ditandatangani basah.)
 */
export default function PengajuanResetPage() {
  const [passwordRequests, setPasswordRequests] = useState<PasswordResetRequest[]>([])
  const [passwordMeta, setPasswordMeta] = useState(EMPTY_META)
  const [passwordPage, setPasswordPage] = useState(1)
  const [passwordPageSize, setPasswordPageSize] = usePageSize('pengajuan-reset-password')
  const [passwordLoading, setPasswordLoading] = useState(true)
  const [passwordBusyId, setPasswordBusyId] = useState<number | null>(null)
  const [passwordError, setPasswordError] = useState('')

  const loadPassword = useCallback(async () => {
    try {
      const response = await getPasswordResetRequests({
        page: passwordPage,
        perPage: passwordPageSize,
      })

      setPasswordRequests(response.data ?? [])
      setPasswordMeta(response.meta ?? EMPTY_META)
      setPasswordError('')
    } catch (requestError) {
      setPasswordError(getApiErrorMessage(requestError, 'Gagal memuat pengajuan reset kata sandi.'))
    } finally {
      setPasswordLoading(false)
    }
  }, [passwordPage, passwordPageSize])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPassword()
  }, [loadPassword])

  const runPassword = async (
    item: PasswordResetRequest,
    action: () => Promise<{ data?: { message?: string } }>,
    fallback: string,
  ) => {
    setPasswordBusyId(item.id)
    setPasswordError('')

    try {
      const response = await action()

      notifySuccess(response.data?.message ?? 'Pengajuan berhasil diproses.')
      await loadPassword()
    } catch (requestError) {
      setPasswordError(getApiErrorMessage(requestError, fallback))
      // Pengajuan mungkin sudah diproses petugas lain; segarkan tabel.
      await loadPassword()
    } finally {
      setPasswordBusyId(null)
    }
  }

  const handleApprovePassword = async (item: PasswordResetRequest) => {
    const confirmed = await confirmDialog({
      title: `Setujui atur ulang kata sandi ${item.user?.name}?`,
      message: 'Pemilik akun dapat membuat kata sandi baru dalam waktu 24 jam setelah disetujui.',
      confirmLabel: 'Setujui',
      tone: 'primary',
    })

    if (!confirmed) return

    await runPassword(
      item,
      () => approvePasswordResetRequest(item.id),
      'Gagal menyetujui pengajuan.',
    )
  }

  const handleRejectPassword = async (item: PasswordResetRequest) => {
    const notes = await promptDialog({
      title: `Tolak pengajuan ${item.user?.name}?`,
      message: 'Kata sandi akun tidak berubah. Pemilik akun menerima notifikasi penolakan.',
      label: 'Catatan untuk pemilik akun (opsional)',
      confirmLabel: 'Tolak Pengajuan',
    })

    if (notes === null) return

    await runPassword(
      item,
      () => rejectPasswordResetRequest(item.id, notes),
      'Gagal menolak pengajuan.',
    )
  }

  if (passwordLoading) {
    return (
      <div className="sid-kelola-wilayah-page">
        <div className="sid-kelola-wilayah-content">
          <PageLoader label="Memuat pengajuan reset..." />
        </div>

        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="sid-kelola-wilayah-page">
      <div className="sid-kelola-wilayah-content">
        <div className="sid-kelola-wilayah-header">
          <div>
            <span className="sid-kelola-wilayah-eyebrow">Akun Pengguna</span>

            <h1>Pengajuan Reset</h1>

            <p>
              Tinjau pengajuan reset kata sandi dari pemilik akun. Reset juga dapat dilakukan
              langsung di Manajemen Pengguna.
            </p>
          </div>

          <div className="sid-kelola-wilayah-header-actions">
            <RefreshButton onRefresh={() => loadPassword()} disabled={passwordBusyId !== null} />
          </div>
        </div>

        <div className="sid-wilayah-table-card">
          <div className="sid-wilayah-table-toolbar">
            <div>
              <h3>Reset Kata Sandi</h3>
              <p>
                Bila disetujui, pemilik akun dapat membuat kata sandi baru sendiri dalam 24 jam.
                Reset juga dapat dilakukan langsung di Manajemen Pengguna.
              </p>
            </div>
          </div>

          {passwordError && (
            <div className="sid-kelola-wilayah-error" role="alert">
              {passwordError}
            </div>
          )}

          <div className="sid-wilayah-table-wrap">
            <table className="sid-wilayah-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Pemohon</th>
                  <th>Wilayah</th>
                  <th>Diajukan</th>
                  <th>Status</th>
                  <th>Diproses</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {passwordRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="sid-wilayah-empty">Belum ada pengajuan reset kata sandi.</div>
                    </td>
                  </tr>
                ) : (
                  passwordRequests.map((item, index) => {
                    const status = PASSWORD_STATUS[item.status] ?? PASSWORD_STATUS.pending
                    const pending = item.status === 'pending'
                    const account = [
                      item.user?.role_label,
                      item.user?.username && `@${item.user.username}`,
                      item.user?.nik_masked,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                    const wilayah = [
                      item.user?.hamlet,
                      item.user?.rt && `RT ${item.user.rt}`,
                      item.user?.rw && `RW ${item.user.rw}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')

                    return (
                      <tr key={item.id}>
                        <td>{(passwordMeta.current_page - 1) * passwordPageSize + index + 1}</td>
                        <td>
                          <span className="sid-wilayah-name">{item.user?.name ?? '-'}</span>
                          {account && <small className="sid-admin-cell-meta">{account}</small>}
                        </td>
                        <td>{wilayah || '-'}</td>
                        <td>{formatDateTime(item.created_at)}</td>
                        <td>
                          <StatusPill tone={status.tone}>{status.label}</StatusPill>
                        </td>
                        <td>
                          {pending ? (
                            '-'
                          ) : (
                            <>
                              <span>{item.handler?.name ?? '-'}</span>
                              <small className="sid-admin-cell-meta">
                                {formatDateTime(item.handled_at)}
                              </small>
                              {item.response_notes && (
                                <small className="sid-admin-cell-meta">
                                  Catatan: {item.response_notes}
                                </small>
                              )}
                            </>
                          )}
                        </td>
                        <td>
                          {pending ? (
                            <div className="sid-wilayah-actions">
                              <button
                                type="button"
                                onClick={() => void handleApprovePassword(item)}
                                className="sid-wilayah-action sid-wilayah-action-edit"
                                title="Setujui atur ulang kata sandi"
                                aria-label={`Setujui atur ulang kata sandi ${item.user?.name}`}
                                disabled={passwordBusyId !== null}
                              >
                                <Check size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleRejectPassword(item)}
                                className="sid-wilayah-action sid-wilayah-action-delete"
                                title="Tolak pengajuan"
                                aria-label={`Tolak pengajuan ${item.user?.name}`}
                                disabled={passwordBusyId !== null}
                              >
                                <X size={15} />
                              </button>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {passwordMeta.total > 0 && (
            <div className="sid-operator-pagination">
              <div className="sid-pagination-meta">
                <p>
                  {formatPageRange(
                    passwordMeta.current_page,
                    passwordPageSize,
                    passwordMeta.total,
                    'pengajuan',
                  )}
                </p>
                <PageSizeSelect
                  value={passwordPageSize}
                  onChange={(value) => {
                    setPasswordPageSize(value)
                    setPasswordPage(1)
                  }}
                />
              </div>
              <div>
                <button
                  type="button"
                  disabled={passwordMeta.current_page <= 1}
                  onClick={() => setPasswordPage(passwordMeta.current_page - 1)}
                >
                  Sebelumnya
                </button>
                <PageNumbers
                  currentPage={passwordMeta.current_page}
                  totalPages={Math.max(1, passwordMeta.last_page)}
                  onChange={setPasswordPage}
                />
                <button
                  type="button"
                  disabled={passwordMeta.current_page >= passwordMeta.last_page}
                  onClick={() => setPasswordPage(passwordMeta.current_page + 1)}
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
