// ==========================================
// PelangganNotifikasiPage.tsx
// Pelanggan Notifikasi (Staf SIDUTama): akun desa yang mengaktifkan
// notifikasi browser (Web Push) beserta status tiap perangkatnya. Hanya
// baca. Endpoint dan kunci push tidak pernah dikirim backend.
// ==========================================

import { Fragment, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { BellRing, ChevronDown, ChevronUp, CircleCheck, Search, Smartphone } from 'lucide-react'

import { SiteFooter } from '@/components/layout/SiteFooter'
import { PageNumbers } from '@/components/ui/PageNumbers'
import { PageSizeSelect } from '@/components/ui/PageSizeSelect'
import { formatPageRange } from '@/components/ui/pageRange'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { StatusPill } from '@/components/ui/StatusPill'
import { usePageSize } from '@/components/ui/usePageSize'
import { WilayahFilterSelects } from '@/features/data-warga/components/WilayahFilterSelects'
import { useWilayahFilter } from '@/features/data-warga/hooks/useWilayahFilter'
import { getWebPushSubscribers } from '@/features/pelanggan-notifikasi/api'
import type {
  PushDevice,
  PushDeviceStatus,
  PushService,
  WebPushSubscriber,
} from '@/features/pelanggan-notifikasi/api'
import {
  formatDateTime,
  formatWilayah,
  PUSH_SERVICE_LABELS,
  PUSH_SERVICE_OPTIONS,
  ROLE_OPTIONS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  STATUS_TONES,
} from '@/features/pelanggan-notifikasi/labels'
import { useDebouncedValue } from '@/features/surat/hooks/useSuratListQuery'
import { useQueryRefresh } from '@/shared/hooks/useQueryRefresh'

const COLUMN_COUNT = 7

type Filters = { role: string; push_service: PushService | ''; status: PushDeviceStatus | '' }

const EMPTY_FILTERS: Filters = { role: '', push_service: '', status: '' }

function StatusBadge({ status }: { status: PushDeviceStatus }) {
  return <StatusPill tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</StatusPill>
}

function DeviceTable({ devices }: { devices: PushDevice[] }) {
  return (
    <table className="sid-push-device-table">
      <thead>
        <tr>
          <th>Perangkat</th>
          <th>Layanan push</th>
          <th>Status</th>
          <th>Didaftarkan</th>
          <th>Terakhir berhasil</th>
          <th>Terakhir gagal</th>
        </tr>
      </thead>
      <tbody>
        {devices.map((device) => (
          <tr key={device.id}>
            <td>{device.device_label ?? 'Tidak diketahui'}</td>
            <td>{PUSH_SERVICE_LABELS[device.push_service]}</td>
            <td>
              <StatusBadge status={device.status} />
            </td>
            <td>{formatDateTime(device.subscribed_at)}</td>
            <td>{formatDateTime(device.last_success_at)}</td>
            <td>{formatDateTime(device.last_failed_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SubscriberRow({ subscriber }: { subscriber: WebPushSubscriber }) {
  const [open, setOpen] = useState(false)
  const detailId = `push-devices-${subscriber.id}`

  return (
    <Fragment>
      <tr>
        <td>
          <span className="primary-text">{subscriber.name}</span>
          <small className="sid-admin-cell-meta">
            {[subscriber.username && `@${subscriber.username}`, subscriber.nik_masked]
              .filter(Boolean)
              .join(' · ')}
          </small>
        </td>
        <td className="center">
          <span className="sid-operator-role">{subscriber.role_label}</span>
        </td>
        <td className="center">{formatWilayah(subscriber.wilayah)}</td>
        <td className="center">
          <StatusBadge status={subscriber.status} />
        </td>
        <td className="center sid-activity-log-time">
          {formatDateTime(subscriber.last_success_at)}
        </td>
        <td className="center sid-activity-log-time">
          {formatDateTime(subscriber.first_subscribed_at)}
        </td>
        <td className="center">
          <button
            type="button"
            className="sid-push-device-toggle"
            aria-expanded={open}
            aria-controls={detailId}
            onClick={() => setOpen((value) => !value)}
          >
            {subscriber.device_count} perangkat
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </td>
      </tr>
      {open && (
        <tr id={detailId} className="sid-push-device-row">
          <td colSpan={COLUMN_COUNT}>
            <DeviceTable devices={subscriber.devices} />
          </td>
        </tr>
      )}
    </Fragment>
  )
}

export default function PelangganNotifikasiPage() {
  const [keyword, setKeyword] = useState('')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = usePageSize('pelanggan-notifikasi')
  const wilayahFilter = useWilayahFilter(() => setPage(1))
  const search = useDebouncedValue(keyword.trim())

  const params = {
    ...filters,
    ...wilayahFilter.params,
    search,
    page,
    per_page: pageSize,
  }

  const { data, isPending, isError } = useQuery({
    queryKey: ['web-push-subscribers', params],
    queryFn: () => getWebPushSubscribers(params),
    placeholderData: keepPreviousData,
  })

  const pageRefresh = useQueryRefresh(['web-push-subscribers'])

  const subscribers = data?.data ?? []
  const meta = data?.meta
  const summary = meta?.summary
  const activeDays = meta?.active_days ?? 30
  const totalPages = Math.max(1, meta?.last_page ?? 1)
  const coverage =
    summary && summary.active_accounts > 0
      ? Math.round((summary.subscribed_accounts / summary.active_accounts) * 100)
      : 0

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  const setPageSize = (value: number) => {
    setPageSizeState(value)
    setPage(1)
  }

  const stats = [
    {
      label: 'Akun berlangganan',
      value: summary?.subscribed_accounts,
      note: summary ? `${coverage}% dari ${summary.active_accounts} akun aktif` : '',
      tone: 'blue',
      icon: BellRing,
    },
    {
      label: 'Perangkat terdaftar',
      value: summary?.devices,
      note: '',
      tone: 'yellow',
      icon: Smartphone,
    },
    {
      label: 'Perangkat aktif',
      value: summary?.devices_by_status.aktif,
      note: summary
        ? `${summary.devices_by_status.perlu_dicek} perlu dicek · ${summary.devices_by_status.belum_teruji} belum teruji`
        : '',
      tone: 'green',
      icon: CircleCheck,
    },
  ]

  return (
    <div className="sid-operator-page">
      <div className="sid-operator-content">
        <div className="sid-operator-header">
          <div>
            <h1>Pelanggan Notifikasi</h1>
            <p>
              Akun yang mengaktifkan notifikasi browser (Web Push) beserta status tiap perangkatnya.
              Hanya baca; data rahasia langganan tidak ditampilkan.
            </p>
          </div>
          <RefreshButton onRefresh={pageRefresh.refresh} refreshing={pageRefresh.refreshing} />
        </div>

        <section className="sid-operator-stats-grid sid-push-stats" aria-label="Ringkasan">
          {stats.map((stat) => (
            <div key={stat.label} className="sid-operator-stat-card">
              <div className="sid-operator-stat-content">
                <p className="sid-operator-stat-label">{stat.label}</p>
                <p className={`sid-operator-stat-value ${stat.tone}`}>{stat.value ?? '-'}</p>
                {stat.note && <small className="sid-admin-cell-meta">{stat.note}</small>}
              </div>
              <div className={`sid-operator-stat-icon ${stat.tone}`}>
                <stat.icon size={20} />
              </div>
            </div>
          ))}
        </section>

        <div className="sid-push-note" role="note">
          <p>
            <strong>Cara membaca status.</strong> <b>Aktif</b>: notifikasi terakhir berhasil
            terkirim dalam {activeDays} hari terakhir. <b>Perlu dicek</b>: lebih dari {activeDays}{' '}
            hari tidak ada pengiriman yang berhasil, atau pengiriman terakhir gagal.{' '}
            <b>Belum teruji</b>: belum pernah ada notifikasi yang dikirim ke perangkat itu.
          </p>
          <p>
            Warga yang mencabut izin notifikasi lewat pengaturan browser, menghapus data situs, atau
            mengganti HP tidak langsung hilang dari daftar. Perangkat itu baru terhapus otomatis
            saat sistem mencoba mengirim notifikasi dan ditolak. Jadi status &quot;Perlu dicek&quot;
            belum tentu rusak, hanya belum terbukti aktif.
          </p>
        </div>

        <div className="sid-operator-filter-card">
          <form
            className="sid-operator-filter-grid sid-push-filters"
            onSubmit={(event) => event.preventDefault()}
          >
            <div className="sid-operator-filter-field sid-push-search">
              <p>Pencarian</p>
              <div className="sid-operator-search">
                <Search size={16} />
                <input
                  value={keyword}
                  onChange={(event) => {
                    setKeyword(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Cari nama, username, atau 16 digit NIK..."
                  aria-label="Cari nama, username, atau NIK"
                />
              </div>
            </div>

            <div className="sid-operator-filter-field">
              <p>Peran</p>
              <select
                aria-label="Filter peran"
                value={filters.role}
                onChange={(event) => updateFilter('role', event.target.value)}
              >
                <option value="">Semua peran</option>
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sid-operator-filter-field">
              <p>Status</p>
              <select
                aria-label="Filter status"
                value={filters.status}
                onChange={(event) =>
                  updateFilter('status', event.target.value as Filters['status'])
                }
              >
                <option value="">Semua status</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sid-operator-filter-field">
              <p>Layanan push</p>
              <select
                aria-label="Filter layanan push"
                value={filters.push_service}
                onChange={(event) =>
                  updateFilter('push_service', event.target.value as Filters['push_service'])
                }
              >
                <option value="">Semua layanan</option>
                {PUSH_SERVICE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <WilayahFilterSelects
              filters={wilayahFilter.filters}
              setFilter={wilayahFilter.setFilter}
              hamletOptions={wilayahFilter.hamletOptions}
              rwOptions={wilayahFilter.rwOptions}
              rtOptions={wilayahFilter.rtOptions}
            />
          </form>
        </div>

        <div className="sid-operator-table-card">
          <div className="sid-operator-table-wrapper">
            <table className="sid-operator-table">
              <thead>
                <tr>
                  <th>Akun</th>
                  <th>Peran</th>
                  <th>Wilayah</th>
                  <th>Status</th>
                  <th>Terakhir berhasil</th>
                  <th>Pertama berlangganan</th>
                  <th>Perangkat</th>
                </tr>
              </thead>
              <tbody>
                {isPending ? (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className="sid-operator-table-message">
                      Memuat pelanggan notifikasi...
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className="sid-operator-table-message" role="alert">
                      Gagal memuat pelanggan notifikasi.
                    </td>
                  </tr>
                ) : subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className="sid-operator-table-message">
                      Belum ada akun yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  subscribers.map((subscriber) => (
                    <SubscriberRow key={subscriber.id} subscriber={subscriber} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!!meta?.total && (
            <div className="sid-operator-pagination">
              <div className="sid-pagination-meta">
                <p>{formatPageRange(meta.current_page, pageSize, meta.total, 'akun')}</p>
                <PageSizeSelect value={pageSize} onChange={setPageSize} />
              </div>
              <div>
                <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Sebelumnya
                </button>
                <PageNumbers currentPage={page} totalPages={totalPages} onChange={setPage} />
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
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
