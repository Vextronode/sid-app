import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, EyeOff, RotateCcw } from 'lucide-react'

import { RefreshButton } from '@/components/ui/RefreshButton'
import { StatusPill } from '@/components/ui/StatusPill'
import { formatDateTime } from '@/features/activity-log/labels'
import { REALTIME_QUERY_META } from '@/features/realtime/constants'
import { useLiveRefetchInterval } from '@/features/realtime/hooks/useLiveRefetchInterval'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import { confirmDialog, promptDialog } from '@/shared/lib/dialog'
import { queryKeys } from '@/shared/lib/queryKeys'
import { notifySuccess } from '@/shared/lib/toast'
import { dismissDisasterAlert, getDisasterAlerts, restoreDisasterAlert } from '../api'
import type { DisasterAlert, DisasterAlertList } from '../api'
import { useUnexpiredAlerts } from '../hooks/useUnexpiredAlerts'
import { ALERT_REFRESH_MS, levelTone } from '../utils'

type PeringatanSigapPanelProps = {
  // Jumlah peringatan yang sedang tampil, untuk label tab.
  onDisplayedCountChange?: (count: number) => void
}

const EMPTY_ALERTS: DisasterAlert[] = []

/**
 * Tab Peringatan SIGAP di halaman Pengumuman (Staf SIDUTama). Isi dari
 * SIGAP tidak bisa diubah; staf hanya menurunkan peringatan satu per satu
 * dengan alasan, dan menampilkan lagi yang salah diturunkan.
 *
 * Diperbarui lewat sinyal realtime `disaster-alerts.changed`; saat
 * WebSocket mati atau putus, dimuat ulang otomatis selama tab browser
 * terlihat. Peringatan yang lewat masa tayang langsung hilang dari daftar.
 */
export function PeringatanSigapPanel({ onDisplayedCountChange }: PeringatanSigapPanelProps) {
  const queryClient = useQueryClient()
  const refetchInterval = useLiveRefetchInterval('disaster-alerts', ALERT_REFRESH_MS)
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const listQuery = (status: DisasterAlertList) => ({
    queryKey: queryKeys.disasterAlerts.staff(status),
    queryFn: () => getDisasterAlerts(status),
    refetchInterval,
    refetchIntervalInBackground: false,
    meta: REALTIME_QUERY_META,
  })

  const displayedQuery = useQuery(listQuery('displayed'))
  const dismissedQuery = useQuery(listQuery('dismissed'))

  const displayed = useUnexpiredAlerts(
    displayedQuery.data ?? EMPTY_ALERTS,
    displayedQuery.dataUpdatedAt,
  )
  const dismissed = useUnexpiredAlerts(
    dismissedQuery.data ?? EMPTY_ALERTS,
    dismissedQuery.dataUpdatedAt,
  )
  const loading = displayedQuery.isPending || dismissedQuery.isPending
  const loadError = displayedQuery.error ?? dismissedQuery.error
  const error =
    actionError ||
    (loadError ? getApiErrorMessage(loadError, 'Gagal memuat peringatan SIGAP.') : '')

  const load = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.disasterAlerts.staffAll }),
    [queryClient],
  )

  const setList = (
    status: DisasterAlertList,
    update: (current: DisasterAlert[]) => DisasterAlert[],
  ) =>
    queryClient.setQueryData<DisasterAlert[]>(queryKeys.disasterAlerts.staff(status), (current) =>
      update(current ?? EMPTY_ALERTS),
    )

  useEffect(() => {
    if (!loading) onDisplayedCountChange?.(displayed.length)
  }, [loading, displayed.length, onDisplayedCountChange])

  const dismiss = async (alert: DisasterAlert) => {
    const reason = await promptDialog({
      title: `Turunkan peringatan "${alert.title}"?`,
      message: `${alert.level_label} · ${alert.type_label}. Peringatan ini hilang dari halaman publik, dan pembaruan dari SIGAP untuk peringatan ini juga tidak tampil sampai Anda menampilkannya lagi. Peringatan akan tampil lagi otomatis bila SIGAP menaikkan levelnya atau ada gempa susulan minimal 1 magnitudo lebih besar.`,
      label: 'Alasan menurunkan (wajib)',
      placeholder: 'Mis. alarm palsu, sudah dikonfirmasi BPBD.',
      minLength: 3,
      confirmLabel: 'Turunkan',
    })

    if (reason === null) return

    setBusyId(alert.id)
    setActionError('')

    try {
      const result = await dismissDisasterAlert(alert.id, reason)
      notifySuccess(result.message)
      setList('displayed', (current) => current.filter((item) => item.id !== alert.id))
      setList('dismissed', (current) => [
        result.data,
        ...current.filter((item) => item.id !== alert.id),
      ])
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError, 'Gagal menurunkan peringatan.'))
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const restore = async (alert: DisasterAlert) => {
    const confirmed = await confirmDialog({
      title: `Tampilkan lagi "${alert.title}"?`,
      message: 'Peringatan tampil lagi di halaman publik. Notifikasi ke warga tidak dikirim ulang.',
      confirmLabel: 'Tampilkan lagi',
      tone: 'primary',
    })

    if (!confirmed) return

    setBusyId(alert.id)
    setActionError('')

    try {
      const result = await restoreDisasterAlert(alert.id)
      notifySuccess(result.message)
      // Urutan tampil (level, lalu terbaru) ditentukan backend.
      await load()
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError, 'Gagal menampilkan lagi peringatan.'))
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const refresh = async () => {
    setActionError('')
    await load()
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
        <AlertTriangle size={18} className="mt-0.5 flex-none text-red-700" aria-hidden="true" />
        <span>
          Peringatan bencana dikirim otomatis oleh SIGAP dan isinya tidak bisa diubah di sini.
          Turunkan peringatan yang keliru, misalnya alarm palsu, satu per satu dengan alasan.
        </span>
      </p>

      {error && (
        <div className="sid-kelola-wilayah-error" role="alert">
          {error}
        </div>
      )}

      <div className="sid-wilayah-table-card">
        <div className="sid-wilayah-table-toolbar">
          <div>
            <h3>Peringatan yang sedang tampil</h3>
            <p>Peringatan teratas tampil di bar merah halaman publik.</p>
          </div>
          <RefreshButton onRefresh={refresh} refreshing={loading} disabled={busyId !== null} />
        </div>

        <div className="sid-wilayah-table-wrap">
          <table className="sid-wilayah-table">
            <thead>
              <tr>
                <th>Level</th>
                <th>Jenis</th>
                <th>Judul</th>
                <th>Waktu Kejadian</th>
                <th>Tampil Sampai</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && displayed.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="sid-wilayah-empty">Memuat peringatan...</div>
                  </td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="sid-wilayah-empty">
                      Tidak ada peringatan dari SIGAP yang sedang tampil.
                    </div>
                  </td>
                </tr>
              ) : (
                displayed.map((alert, index) => (
                  <tr key={alert.id}>
                    <td className="center">
                      <StatusPill tone={levelTone(alert.level)}>{alert.level_label}</StatusPill>
                    </td>
                    <td className="center">{alert.type_label}</td>
                    <td className="center">
                      <span className="block font-semibold">{alert.title}</span>
                      {index === 0 && (
                        <span className="mt-1 inline-block rounded bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-700">
                          Tampil di bar beranda
                        </span>
                      )}
                    </td>
                    <td className="center">{formatDateTime(alert.occurred_at)}</td>
                    <td className="center">{formatDateTime(alert.expires_at)}</td>
                    <td className="center">
                      <button
                        type="button"
                        className="sid-wilayah-btn sid-wilayah-btn-secondary"
                        disabled={busyId !== null}
                        onClick={() => dismiss(alert)}
                      >
                        <EyeOff size={15} aria-hidden="true" />
                        {busyId === alert.id ? 'Memproses...' : 'Turunkan'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sid-wilayah-table-card">
        <div className="sid-wilayah-table-toolbar">
          <div>
            <h3>Baru diturunkan</h3>
            <p>
              Peringatan yang diturunkan dan masih bisa ditampilkan lagi, selama belum diakhiri
              SIGAP dan belum lewat masa tayang. Peringatan tampil lagi otomatis bila SIGAP
              menaikkan levelnya atau ada gempa susulan minimal 1 magnitudo lebih besar.
            </p>
          </div>
        </div>

        <div className="sid-wilayah-table-wrap">
          <table className="sid-wilayah-table">
            <thead>
              <tr>
                <th>Judul</th>
                <th>Diturunkan Oleh</th>
                <th>Waktu</th>
                <th>Alasan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {dismissed.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="sid-wilayah-empty">Belum ada peringatan yang diturunkan.</div>
                  </td>
                </tr>
              ) : (
                dismissed.map((alert) => (
                  <tr key={alert.id}>
                    <td className="center">
                      <span className="block font-semibold">{alert.title}</span>
                      <span className="text-xs text-gray-500">{alert.level_label}</span>
                    </td>
                    <td className="center">{alert.dismissed_by?.name ?? '-'}</td>
                    <td className="center">{formatDateTime(alert.dismissed_at)}</td>
                    <td>{alert.dismiss_reason ?? '-'}</td>
                    <td className="center">
                      <button
                        type="button"
                        className="sid-wilayah-btn sid-wilayah-btn-secondary"
                        disabled={busyId !== null}
                        onClick={() => restore(alert)}
                      >
                        <RotateCcw size={15} aria-hidden="true" />
                        {busyId === alert.id ? 'Memproses...' : 'Tampilkan lagi'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
