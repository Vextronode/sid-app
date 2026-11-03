import { useState } from 'react'
import { User as UserIcon } from 'lucide-react'

import { PageLoader } from '@/components/ui/PageLoader'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { StatusPill } from '@/components/ui/StatusPill'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import {
  approveProfilePhotoRequest,
  getProfilePhotoRequestPhotoUrl,
  getProfilePhotoRequests,
  rejectProfilePhotoRequest,
} from '../api'
import { PhotoZoom } from './PhotoZoom'
import { RequestPagination } from './RequestPagination'
import { useRequestList } from '../hooks/useRequestList'
import { useRequestPhoto } from '../hooks/useRequestPhoto'
import { LEVEL_LABELS, REQUEST_STATUS, STATUS_FILTERS, areaLabel, formatDateTime } from '../labels'
import { confirmDialog, promptDialog } from '@/shared/lib/dialog'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import { notifySuccess } from '@/shared/lib/toast'
import type { ProfilePhotoRequest } from '../api'

import '@/styles/aktivasi-akun.css'

type DetailProps = {
  item: ProfilePhotoRequest
  busy: boolean
  onClose: () => void
  onApprove: () => void
  onReject: () => void
}

/**
 * Rincian satu permintaan: foto yang sedang terpasang di samping foto baru
 * dari kamera. Foto baru hanya ada selama diproses atau setelah ditolak.
 */
function PhotoRequestDetail({ item, busy, onClose, onApprove, onReject }: DetailProps) {
  const photo = useRequestPhoto(item.id, item.has_photo, getProfilePhotoRequestPhotoUrl)
  const status = REQUEST_STATUS[item.status]
  const name = item.user.name ?? 'warga'

  return (
    <div className="sid-modal-overlay">
      <div
        className="sid-modal sid-activation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-request-detail-heading"
      >
        <h2 id="photo-request-detail-heading">{item.user.name ?? 'Warga'}</h2>

        <dl className="sid-activation-facts">
          <dt>Status</dt>
          <dd>
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
          </dd>
          <dt>NIK</dt>
          <dd>{item.user.nik_masked ?? '-'}</dd>
          <dt>Username</dt>
          <dd>{item.user.username ?? '-'}</dd>
          <dt>Wilayah</dt>
          <dd>{areaLabel(item.area)}</dd>
          <dt>Diminta</dt>
          <dd>{formatDateTime(item.created_at)}</dd>
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

        <div className="sid-photo-compare">
          <figure>
            <figcaption>Foto saat ini</figcaption>
            {item.user.current_photo_url ? (
              <img src={item.user.current_photo_url} alt={`Foto profil ${name} saat ini`} />
            ) : (
              <div className="sid-photo-compare-empty">
                <UserIcon size={28} aria-hidden="true" />
                <span>Belum ada foto</span>
              </div>
            )}
          </figure>

          <figure>
            <figcaption>Foto baru dari kamera</figcaption>
            {item.has_photo ? (
              photo.url ? (
                <PhotoZoom src={photo.url} alt={`Foto baru ${name}`} />
              ) : (
                <p className="sid-photo-missing" role={photo.error ? 'alert' : undefined}>
                  {photo.error || 'Memuat foto...'}
                </p>
              )
            ) : (
              <p className="sid-photo-missing">
                {item.status === 'approved'
                  ? 'Sudah dipasang sebagai foto profil.'
                  : 'Tidak ada foto.'}
              </p>
            )}
          </figure>
        </div>

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
                Pasang foto
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Permintaan warga mengganti foto profil, section di Manajemen Akun.
 * Jenjang pemegangnya sama dengan aktivasi akun; Staf SIDUTama juga melihat
 * seluruh riwayat desa.
 */
export function FotoProfilRequestSection() {
  const { user } = useAuth()
  const isStaf = user?.role === 'staf_sid'
  const list = useRequestList(
    getProfilePhotoRequests,
    'request-foto-profil',
    'Gagal memuat daftar permintaan ganti foto.',
  )
  const { items, status, load, setError } = list
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<ProfilePhotoRequest | null>(null)

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

  const approve = async (item: ProfilePhotoRequest) => {
    const confirmed = await confirmDialog({
      title: `Pasang foto baru ${item.user.name}?`,
      message: 'Pastikan foto baru adalah wajah warga tersebut. Foto lama akan diganti.',
      confirmLabel: 'Pasang foto',
      tone: 'primary',
    })

    if (confirmed) await run(() => approveProfilePhotoRequest(item.id), 'Gagal memasang foto.')
  }

  const reject = async (item: ProfilePhotoRequest) => {
    const notes = await promptDialog({
      title: `Tolak foto baru ${item.user.name}?`,
      message: 'Warga menerima catatan ini lewat notifikasi, lalu bisa mengirim foto lain.',
      label: 'Catatan penolakan (wajib)',
      placeholder: 'Mis. wajah tertutup masker',
      minLength: 5,
      confirmLabel: 'Tolak permintaan',
    })

    if (notes !== null) {
      await run(() => rejectProfilePhotoRequest(item.id, notes), 'Gagal menolak permintaan.')
    }
  }

  if (list.loading) return <PageLoader label="Memuat permintaan ganti foto..." />

  return (
    <>
      <div className="sid-wilayah-table-card">
        <div className="sid-wilayah-table-toolbar">
          <div>
            <h3>Request Ganti Foto Profil</h3>
            <p>
              {isStaf
                ? 'Permintaan warga menunggu di RT wilayahnya; bila jabatan RT, RW, dan Kepala Dusun kosong, permintaan masuk ke Anda. Riwayat seluruh desa juga tampil di sini.'
                : 'Bandingkan foto baru dengan foto lama warga di wilayah Anda, lalu pasang atau tolak dengan catatan.'}
            </p>
          </div>

          <div className="sid-wilayah-toolbar-controls">
            <select
              value={status}
              onChange={(event) => list.setStatus(event.target.value)}
              className="sid-wilayah-filter"
              aria-label="Filter status permintaan"
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
                <th>Warga</th>
                <th>Wilayah</th>
                <th>Diminta</th>
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
                        ? 'Tidak ada permintaan ganti foto yang menunggu Anda.'
                        : 'Belum ada permintaan ganti foto.'}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const pill = REQUEST_STATUS[item.status]

                  return (
                    <tr key={item.id}>
                      <td>
                        <span className="sid-wilayah-name">{item.user.name ?? '-'}</span>
                        <small className="sid-admin-cell-meta">
                          {item.user.nik_masked}
                          {item.user.username ? `, @${item.user.username}` : ''}
                        </small>
                      </td>
                      <td>{areaLabel(item.area)}</td>
                      <td>{formatDateTime(item.created_at)}</td>
                      <td>
                        <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                      </td>
                      <td>
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
                      <td>
                        <div className="sid-wilayah-actions">
                          <button
                            type="button"
                            className="sid-button sid-button-outline"
                            onClick={() => setSelected(item)}
                            aria-label={`Periksa foto ${item.user.name}`}
                          >
                            {item.can_decide ? 'Periksa' : 'Rincian'}
                          </button>
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
          noun="permintaan"
          onPageChange={list.setPage}
          onPageSizeChange={list.setPageSize}
        />
      </div>

      {selected && (
        <PhotoRequestDetail
          item={selected}
          busy={busy}
          onClose={() => setSelected(null)}
          onApprove={() => void approve(selected)}
          onReject={() => void reject(selected)}
        />
      )}
    </>
  )
}
