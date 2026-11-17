import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, EyeOff, RotateCcw } from 'lucide-react'

import { RefreshButton } from '@/components/ui/RefreshButton'
import { StatusPill } from '@/components/ui/StatusPill'
import { formatDateTime } from '@/features/activity-log/labels'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import { confirmDialog, promptDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'
import { dismissDisasterAlert, getDisasterAlerts, restoreDisasterAlert } from '../api'
import type { DisasterAlert } from '../api'
import { ALERT_REFRESH_MS, levelTone } from '../utils'

type PeringatanSigapPanelProps = {
  // Jumlah peringatan yang sedang tampil, untuk label tab.
  onDisplayedCountChange?: (count: number) => void
}

/**
 * Tab Peringatan SIGAP di halaman Pengumuman (Staf SIDUTama). Isi dari
 * SIGAP tidak bisa diubah; staf hanya menurunkan peringatan satu per satu
 * dengan alasan, dan menampilkan lagi yang salah diturunkan. Dimuat ulang
 * otomatis selama tab browser terlihat.
 */
export function PeringatanSigapPanel({ onDisplayedCountChange }: PeringatanSigapPanelProps) {
  const [displayed, setDisplayed] = useState<DisasterAlert[]>([])
  const [dismissed, setDismissed] = useState<DisasterAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [shown, hidden] = await Promise.all([
        getDisasterAlerts('displayed'),
        getDisasterAlerts('dismissed'),
      ])
      setDisplayed(shown)
      setDismissed(hidden)
      setError('')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal memuat peringatan SIGAP.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()

    const interval = setInterval(() => {
      if (document.visibilityState !== 'hidden') void load()
    }, ALERT_REFRESH_MS)

    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    if (!loading) onDisplayedCountChange?.(displayed.length)
  }, [loading, displayed.length, onDisplayedCountChange])

  const dismiss = async (alert: DisasterAlert) => {
    const reason = await promptDialog({
      title: `Turunkan peringatan "${alert.title}"?`,
      message: `${alert.level_label} · ${alert.type_label}. Peringatan ini hilang dari halaman publik, dan pembaruan dari SIGAP untuk peringatan ini juga tidak tampil sampai Anda menampilkannya lagi.`,
      label: 'Alasan menurunkan (wajib)',
      placeholder: 'Mis. alarm palsu, sudah dikonfirmasi BPBD.',
      minLength: 3,
      confirmLabel: 'Turunkan',
    })

    if (reason === null) return

    setBusyId(alert.id)
    setError('')

    try {
      const result = await dismissDisasterAlert(alert.id, reason)
      notifySuccess(result.message)
      setDisplayed((current) => current.filter((item) => item.id !== alert.id))
      setDismissed((current) => [result.data, ...current.filter((item) => item.id !== alert.id)])
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal menurunkan peringatan.'))
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
    setError('')

    try {
      const result = await restoreDisasterAlert(alert.id)
      notifySuccess(result.message)
      // Urutan tampil (level, lalu terbaru) ditentukan backend.
      await load()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal menampilkan lagi peringatan.'))
      await load()
    } finally {
      setBusyId(null)
    }
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
          <RefreshButton onRefresh={load} refreshing={loading} disabled={busyId !== null} />
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
                    <td>
                      <span className="font-semibold">{alert.title}</span>
                      {index === 0 && (
                        <span className="ml-2 inline-block rounded bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-700">
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
              SIGAP dan belum lewat masa tayang.
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
                    <td>
                      <span className="font-semibold">{alert.title}</span>
                      <span className="ml-2 text-xs text-gray-500">{alert.level_label}</span>
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
