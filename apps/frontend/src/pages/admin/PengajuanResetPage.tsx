import { Check, KeyRound, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { SiteFooter } from '@/components/layout/SiteFooter'
import { PageLoader } from '@/components/ui/PageLoader'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { PageNumbers } from '@/components/ui/PageNumbers'
import { PageSizeSelect } from '@/components/ui/PageSizeSelect'
import { formatPageRange } from '@/components/ui/pageRange'
import { StatusPill } from '@/components/ui/StatusPill'
import { usePageSize } from '@/components/ui/usePageSize'
import {
  approveSignatureResetRequest,
  getSignatureResetRequests,
  rejectSignatureResetRequest,
} from '@/features/surat/api/signatureApi'
import { confirmDialog, promptDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import type { StatusTone } from '@/components/ui/StatusPill'
import type { SignatureResetRequest } from '@/features/surat/api/signatureApi'
import type { PageMeta } from '@/types'

const STATUS: Record<string, { tone: StatusTone; label: string }> = {
  pending: { tone: 'warning', label: 'Menunggu' },
  approved: { tone: 'active', label: 'Disetujui' },
  rejected: { tone: 'danger', label: 'Ditolak' },
}

const EMPTY_META: Pick<PageMeta, 'current_page' | 'last_page' | 'total'> = {
  current_page: 1,
  last_page: 1,
  total: 0,
}

// Dua jenis pengajuan sebagai tab seperti halaman Data Warga; tab aktif
// disimpan di ?tab= agar tetap saat halaman dimuat ulang.
const SECTIONS = [
  { value: 'ttd', label: 'Reset Tanda Tangan' },
  { value: 'password', label: 'Reset Kata Sandi' },
]

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
 * Pengajuan reset dari pemilik akun beserta riwayatnya: yang menunggu di
 * atas, lalu yang sudah diputuskan (termasuk yang direset langsung di
 * Manajemen Pengguna) dari yang terbaru.
 */
export default function PengajuanResetPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeSection = searchParams.get('tab') === 'password' ? 'password' : 'ttd'
  const switchSection = (value: string) =>
    setSearchParams(value === 'ttd' ? {} : { tab: value }, { replace: true })
  const [requests, setRequests] = useState<SignatureResetRequest[]>([])
  const [meta, setMeta] = useState(EMPTY_META)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = usePageSize('pengajuan-reset-ttd')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const response = await getSignatureResetRequests({ page, perPage: pageSize })

      setRequests(response.data ?? [])
      setMeta(response.meta ?? EMPTY_META)
      setError('')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal memuat pengajuan reset.'))
    } finally {
      setLoading(false)
    }
  }, [page, pageSize])

  useEffect(() => {
    // Muat awal menyinkronkan state dengan data backend.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const run = async (
    item: SignatureResetRequest,
    action: () => Promise<{ data?: { message?: string } }>,
    fallback: string,
  ) => {
    setBusyId(item.id)
    setError('')

    try {
      const response = await action()

      notifySuccess(response.data?.message ?? 'Pengajuan berhasil diproses.')
      await load()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, fallback))
      // Pengajuan mungkin sudah diproses petugas lain; segarkan tabel.
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const handleApprove = async (item: SignatureResetRequest) => {
    const confirmed = await confirmDialog({
      title: `Setujui reset tanda tangan ${item.user?.name}?`,
      message:
        'Tanda tangan akun dikosongkan dan pemiliknya dapat mengisi yang baru. Tanda tangan lama tetap tersimpan untuk dokumen yang sudah terbit.',
      confirmLabel: 'Setujui & Reset',
      tone: 'primary',
    })

    if (!confirmed) return

    await run(item, () => approveSignatureResetRequest(item.id), 'Gagal menyetujui pengajuan.')
  }

  const handleReject = async (item: SignatureResetRequest) => {
    const notes = await promptDialog({
      title: `Tolak pengajuan ${item.user?.name}?`,
      message: 'Tanda tangan akun tidak berubah. Pemilik akun menerima notifikasi penolakan.',
      label: 'Catatan untuk pemilik akun (opsional)',
      confirmLabel: 'Tolak Pengajuan',
    })

    if (notes === null) return

    await run(item, () => rejectSignatureResetRequest(item.id, notes), 'Gagal menolak pengajuan.')
  }

  if (loading) {
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
              Tinjau pengajuan reset dari pemilik akun. Reset juga dapat dilakukan langsung di
              Manajemen Pengguna.
            </p>
          </div>

          <div className="sid-kelola-wilayah-header-actions">
            <RefreshButton onRefresh={() => load()} disabled={busyId !== null} />
          </div>
        </div>

        {error && (
          <div className="sid-kelola-wilayah-error" role="alert">
            {error}
          </div>
        )}

        <div className="sid-wilayah-tabs" role="tablist" aria-label="Pilih jenis pengajuan reset">
          {SECTIONS.map((section) => (
            <button
              key={section.value}
              id={`reset-tab-${section.value}`}
              type="button"
              role="tab"
              aria-selected={section.value === activeSection}
              aria-controls={`reset-panel-${section.value}`}
              className={`sid-wilayah-tab${section.value === activeSection ? ' sid-wilayah-tab-active' : ''}`}
              onClick={() => switchSection(section.value)}
            >
              {section.label}
            </button>
          ))}
        </div>

        {activeSection === 'ttd' && (
          <div
            id="reset-panel-ttd"
            role="tabpanel"
            aria-labelledby="reset-tab-ttd"
            className="sid-wilayah-table-card"
          >
            <div className="sid-wilayah-table-toolbar">
              <div>
                <h3>Reset Tanda Tangan</h3>
                <p>
                  Bila disetujui, tanda tangan akun dikosongkan dan dapat diisi kembali. Pengajuan
                  yang sudah diputuskan tetap tercatat sebagai riwayat.
                </p>
              </div>
            </div>

            <div className="sid-wilayah-table-wrap">
              <table className="sid-wilayah-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Pemilik Akun</th>
                    <th>Alasan</th>
                    <th>Diajukan</th>
                    <th>Status</th>
                    <th>Diproses</th>
                    <th>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="sid-wilayah-empty">
                          Belum ada pengajuan reset tanda tangan.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    requests.map((item, index) => {
                      const status = STATUS[item.status] ?? STATUS.pending
                      const pending = item.status === 'pending'
                      const account = [
                        item.user?.role_label,
                        item.user?.username && `@${item.user.username}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')

                      return (
                        <tr key={item.id}>
                          <td>{(meta.current_page - 1) * pageSize + index + 1}</td>
                          <td>
                            <span className="sid-wilayah-name">{item.user?.name ?? '-'}</span>
                            {account && <small className="sid-admin-cell-meta">{account}</small>}
                          </td>
                          <td>{item.reason}</td>
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
                                  onClick={() => void handleApprove(item)}
                                  className="sid-wilayah-action sid-wilayah-action-edit"
                                  title="Setujui dan reset tanda tangan"
                                  aria-label={`Setujui reset tanda tangan ${item.user?.name}`}
                                  disabled={busyId !== null}
                                >
                                  <Check size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleReject(item)}
                                  className="sid-wilayah-action sid-wilayah-action-delete"
                                  title="Tolak pengajuan"
                                  aria-label={`Tolak pengajuan ${item.user?.name}`}
                                  disabled={busyId !== null}
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

            {meta.total > 0 && (
              <div className="sid-operator-pagination">
                <div className="sid-pagination-meta">
                  <p>{formatPageRange(meta.current_page, pageSize, meta.total, 'pengajuan')}</p>
                  <PageSizeSelect
                    value={pageSize}
                    onChange={(value) => {
                      setPageSize(value)
                      setPage(1)
                    }}
                  />
                </div>
                <div>
                  <button
                    type="button"
                    disabled={meta.current_page <= 1}
                    onClick={() => setPage(meta.current_page - 1)}
                  >
                    Sebelumnya
                  </button>
                  <PageNumbers
                    currentPage={meta.current_page}
                    totalPages={Math.max(1, meta.last_page)}
                    onChange={setPage}
                  />
                  <button
                    type="button"
                    disabled={meta.current_page >= meta.last_page}
                    onClick={() => setPage(meta.current_page + 1)}
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'password' && (
          <div
            id="reset-panel-password"
            role="tabpanel"
            aria-labelledby="reset-tab-password"
            className="sid-wilayah-table-card"
          >
            <div className="sid-wilayah-table-toolbar">
              <div>
                <h3>Reset Kata Sandi</h3>
                <p>Segera hadir. Sementara ini, atur ulang kata sandi lewat Manajemen Pengguna.</p>
              </div>
            </div>

            <div className="sid-wilayah-empty">
              <KeyRound size={20} aria-hidden="true" /> Segera Hadir
            </div>
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  )
}
