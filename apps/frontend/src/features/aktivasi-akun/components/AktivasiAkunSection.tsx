import { useState } from 'react'

import { PageLoader } from '@/components/ui/PageLoader'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { StatusPill } from '@/components/ui/StatusPill'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import {
  approveAccountRegistration,
  getAccountRegistrationPhotoUrl,
  getAccountRegistrations,
  manualActivateAccount,
  rejectAccountRegistration,
} from '../api'
import { PhotoZoom } from './PhotoZoom'
import { RequestPagination } from './RequestPagination'
import { useRequestList } from '../hooks/useRequestList'
import { useRequestPhoto } from '../hooks/useRequestPhoto'
import { LEVEL_LABELS, REQUEST_STATUS, STATUS_FILTERS, areaLabel, formatDateTime } from '../labels'
import { confirmDialog, promptDialog } from '@/shared/lib/dialog'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import { notifySuccess } from '@/shared/lib/toast'
import type { AccountRegistration } from '../api'

import '@/styles/aktivasi-akun.css'

type DetailProps = {
  item: AccountRegistration
  busy: boolean
  onClose: () => void
  onApprove: () => void
  onReject: () => void
}

/**
 * Rincian satu pendaftaran. Foto hanya ada selama diproses atau setelah
 * ditolak; begitu disetujui, foto menjadi foto profil akun.
 */
function RegistrationDetail({ item, busy, onClose, onApprove, onReject }: DetailProps) {
  const photo = useRequestPhoto(item.id, item.has_photo, getAccountRegistrationPhotoUrl)
  const status = REQUEST_STATUS[item.status]

  return (
    <div className="sid-modal-overlay">
      <div
        className="sid-modal sid-activation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activation-detail-heading"
      >
        <h2 id="activation-detail-heading">{item.citizen.name ?? 'Pendaftar'}</h2>

        <dl className="sid-activation-facts">
          <dt>Status</dt>
          <dd>
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
          </dd>
          <dt>NIK</dt>
          <dd>{item.citizen.nik_masked ?? '-'}</dd>
          <dt>Username</dt>
          <dd>{item.username ?? '-'}</dd>
          <dt>Wilayah</dt>
          <dd>{areaLabel(item.area)}</dd>
          <dt>Didaftarkan</dt>
          <dd>{formatDateTime(item.created_at)}</dd>
          {item.rejection_count > 0 && (
            <>
              <dt>Pernah ditolak</dt>
              <dd>
                {item.rejection_count} kali{item.banned ? ' (diblokir)' : ''}
              </dd>
            </>
          )}
          {item.status !== 'pending' && (
            <>
              <dt>Diputuskan</dt>
              <dd>
                {item.decided_by ?? '-'}
                {item.level ? ` (${LEVEL_LABELS[item.level]})` : ''},{' '}
                {formatDateTime(item.decided_at)}
              </dd>
            </>
          )}
          {item.decision_notes && (
            <>
              <dt>Catatan</dt>
              <dd>{item.decision_notes}</dd>
            </>
          )}
        </dl>

        {item.has_photo ? (
          photo.url ? (
            <PhotoZoom src={photo.url} alt={`Foto wajah ${item.citizen.name ?? 'pendaftar'}`} />
          ) : (
            <p className="sid-photo-missing" role={photo.error ? 'alert' : undefined}>
              {photo.error || 'Memuat foto...'}
            </p>
          )
        ) : (
          <p className="sid-photo-missing">
            {item.status === 'approved'
              ? 'Foto sudah dipakai sebagai foto profil akun.'
              : 'Tidak ada foto.'}
          </p>
        )}

        <div className="sid-modal-actions">
          <button type="button" className="sid-button sid-button-outline" onClick={onClose}>
            Tutup
          </button>
          {item.can_decide && (
            <>
              <button
                type="button"
                className="sid-button sid-button-outline"
                onClick={onReject}
                disabled={busy}
              >
                Tolak
              </button>
              <button
                type="button"
                className="sid-button sid-button-primary"
                onClick={onApprove}
                disabled={busy}
              >
                Aktifkan akun
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Aktivasi akun warga hasil pendaftaran online, section di Manajemen Akun.
 * RT, RW, Kepala Dusun, dan Staf SIDUTama melihat permintaan yang sedang
 * menjadi wewenangnya dan riwayat yang mereka putuskan; Staf SIDUTama
 * melihat seluruh riwayat desa dan mengaktifkan manual NIK yang diblokir.
 */
export function AktivasiAkunSection() {
  const { user } = useAuth()
  const isStaf = user?.role === 'staf_sid'
  const list = useRequestList(
    getAccountRegistrations,
    'aktivasi-akun',
    'Gagal memuat daftar aktivasi akun.',
  )
  const { items, status, load, setError } = list
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<AccountRegistration | null>(null)
  const [temporary, setTemporary] = useState<{ name: string; password: string } | null>(null)

  const run = async (action: () => Promise<{ data?: { message?: string } }>, fallback: string) => {
    setBusy(true)
    setError('')

    try {
      const response = await action()

      notifySuccess(response.data?.message ?? 'Berhasil diproses.')
      setSelected(null)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, fallback))
    } finally {
      setBusy(false)
      // Permintaan mungkin sudah diputuskan atau berpindah ke petugas lain.
      await load()
    }
  }

  const approve = async (item: AccountRegistration) => {
    const confirmed = await confirmDialog({
      title: `Aktifkan akun ${item.citizen.name}?`,
      message: 'Pastikan foto sesuai dengan warga tersebut. Foto ini menjadi foto profil akunnya.',
      confirmLabel: 'Aktifkan akun',
      tone: 'primary',
    })

    if (confirmed) await run(() => approveAccountRegistration(item.id), 'Gagal mengaktifkan akun.')
  }

  const reject = async (item: AccountRegistration) => {
    const notes = await promptDialog({
      title: `Tolak pendaftaran ${item.citizen.name}?`,
      message:
        item.rejection_count + 1 >= 3
          ? 'Ini penolakan ketiga: NIK ini akan diblokir dan hanya bisa diaktifkan di kantor desa.'
          : 'Pendaftar membaca catatan ini saat mencoba masuk, lalu bisa mendaftar ulang.',
      label: 'Catatan penolakan (wajib)',
      placeholder: 'Mis. foto wajah tidak jelas',
      minLength: 5,
      confirmLabel: 'Tolak pendaftaran',
    })

    if (notes !== null) {
      await run(() => rejectAccountRegistration(item.id, notes), 'Gagal menolak pendaftaran.')
    }
  }

  const activateManually = async (item: AccountRegistration) => {
    const confirmed = await confirmDialog({
      title: `Aktifkan manual akun ${item.citizen.name}?`,
      message:
        'Lakukan hanya setelah warga datang dan identitasnya dicek langsung. Akun mendapat kata sandi sementara yang wajib diganti saat masuk.',
      confirmLabel: 'Aktifkan manual',
      tone: 'primary',
    })

    if (!confirmed) return

    setBusy(true)
    setError('')

    try {
      const response = await manualActivateAccount(item.id)

      setTemporary({
        name: item.citizen.name ?? 'warga',
        password: response.data.temporary_password,
      })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal mengaktifkan akun.'))
    } finally {
      setBusy(false)
      await load()
    }
  }

  if (list.loading) return <PageLoader label="Memuat aktivasi akun..." />

  return (
    <>
      <div className="sid-wilayah-table-card">
        <div className="sid-wilayah-table-toolbar">
          <div>
            <h3>Aktivasi Akun</h3>
            <p>
              {isStaf
                ? 'Warga yang mendaftar menunggu di RT wilayahnya; bila jabatan RT, RW, dan Kepala Dusun kosong, permintaan masuk ke Anda. Riwayat seluruh desa juga tampil di sini.'
                : 'Periksa foto wajah pendaftar dari wilayah Anda, lalu aktifkan akunnya atau tolak dengan catatan.'}
            </p>
          </div>

          <div className="sid-wilayah-toolbar-controls">
            <select
              value={status}
              onChange={(event) => list.setStatus(event.target.value)}
              className="sid-wilayah-filter"
              aria-label="Filter status pendaftaran"
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <RefreshButton onRefresh={() => load()} disabled={busy} />
          </div>
        </div>

        {list.error && (
          <div className="sid-kelola-wilayah-error" role="alert">
            {list.error}
          </div>
        )}

        <div className="sid-wilayah-table-wrap">
          <table className="sid-wilayah-table">
            <thead>
              <tr>
                <th>Pendaftar</th>
                <th>Wilayah</th>
                <th>Didaftarkan</th>
                <th>Status</th>
                <th>Keputusan</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="sid-wilayah-empty">
                      {status === 'pending'
                        ? 'Tidak ada pendaftaran yang menunggu Anda.'
                        : 'Belum ada pendaftaran akun.'}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const pill = REQUEST_STATUS[item.status]

                  return (
                    <tr key={item.id}>
                      <td>
                        <span className="sid-wilayah-name">{item.citizen.name ?? '-'}</span>
                        <small className="sid-admin-cell-meta">
                          {item.citizen.nik_masked}
                          {item.username ? `, @${item.username}` : ''}
                        </small>
                      </td>
                      <td className="center">{areaLabel(item.area)}</td>
                      <td className="center">{formatDateTime(item.created_at)}</td>
                      <td className="center">
                        <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                        {item.banned && item.status === 'rejected' && (
                          <small className="sid-admin-cell-meta">
                            Diblokir ({item.rejection_count}x ditolak)
                          </small>
                        )}
                        {item.method === 'manual' && (
                          <small className="sid-admin-cell-meta">Aktivasi manual</small>
                        )}
                      </td>
                      <td className="center">
                        {item.status === 'pending' ? (
                          <span>Menunggu {item.level ? LEVEL_LABELS[item.level] : 'petugas'}</span>
                        ) : (
                          <>
                            <span>
                              {item.decided_by ?? '-'}
                              {item.level ? ` (${LEVEL_LABELS[item.level]})` : ''}
                            </span>
                            <small className="sid-admin-cell-meta">
                              {formatDateTime(item.decided_at)}
                            </small>
                            {item.decision_notes && (
                              <small className="sid-admin-cell-meta">
                                Catatan: {item.decision_notes}
                              </small>
                            )}
                          </>
                        )}
                      </td>
                      <td className="center">
                        <div className="sid-wilayah-actions">
                          <button
                            type="button"
                            className="sid-button sid-button-outline"
                            onClick={() => setSelected(item)}
                            aria-label={`Periksa pendaftaran ${item.citizen.name}`}
                          >
                            {item.can_decide ? 'Periksa' : 'Rincian'}
                          </button>
                          {item.can_manual_activate && (
                            <button
                              type="button"
                              className="sid-button sid-button-primary"
                              onClick={() => void activateManually(item)}
                              disabled={busy}
                            >
                              Aktifkan manual
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <RequestPagination
          meta={list.meta}
          pageSize={list.pageSize}
          noun="pendaftaran"
          onPageChange={list.setPage}
          onPageSizeChange={list.setPageSize}
        />
      </div>

      {selected && (
        <RegistrationDetail
          item={selected}
          busy={busy}
          onClose={() => setSelected(null)}
          onApprove={() => void approve(selected)}
          onReject={() => void reject(selected)}
        />
      )}

      {temporary && (
        <div className="sid-modal-overlay">
          <div
            className="sid-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="temporary-heading"
          >
            <h2 id="temporary-heading">Kata Sandi Sementara</h2>
            <p>
              Berikan kata sandi ini langsung kepada <strong>{temporary.name}</strong>. Kata sandi
              hanya ditampilkan sekali dan wajib diganti saat masuk.
            </p>
            <label className="sid-form-group">
              <span className="sid-form-label">Kata sandi sementara</span>
              <input
                className="sid-input"
                readOnly
                value={temporary.password}
                onFocus={(event) => event.target.select()}
              />
            </label>
            <div className="sid-modal-actions">
              <button
                type="button"
                className="sid-button sid-button-primary"
                onClick={() => setTemporary(null)}
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
