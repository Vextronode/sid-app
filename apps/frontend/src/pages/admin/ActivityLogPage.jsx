// ==========================================
// ActivityLogPage.jsx
// Log Aktivitas Petugas Desa (S-05): riwayat perubahan data warga & KK
// dan riwayat status surat desa. Hanya baca. Tab dan filter disimpan di
// query string agar bisa ditautkan dari baris warga/KK.
// ==========================================

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'

import { SiteFooter } from '@/components/layout/SiteFooter'
import { PageNumbers } from '@/components/ui/PageNumbers'
import { SURAT_STATUS_OPTIONS, STATUS_LABELS } from '@/constants/suratStatus'
import { getLetterActivityLogs, getPopulationLogs } from '@/features/activity-log/api'
import {
  fieldLabel,
  formatChangeValue,
  formatDateTime,
  POPULATION_EVENT_LABELS,
  POPULATION_EVENT_OPTIONS,
  POPULATION_TYPE_OPTIONS,
} from '@/features/activity-log/labels'

const TABS = [
  { value: 'penduduk', label: 'Data Warga & KK' },
  { value: 'surat', label: 'Surat' },
]

const EMPTY_META = { current_page: 1, last_page: 1, total: 0 }

function Pagination({ meta, onChange }) {
  const totalPages = Math.max(1, meta.last_page ?? 1)
  const currentPage = meta.current_page ?? 1

  if (totalPages <= 1) return null

  return (
    <div className="sid-operator-pagination">
      <p>
        Halaman {currentPage} dari {totalPages} · {meta.total} entri
      </p>
      <div>
        <button type="button" disabled={currentPage <= 1} onClick={() => onChange(currentPage - 1)}>
          Sebelumnya
        </button>
        <PageNumbers currentPage={currentPage} totalPages={totalPages} onChange={onChange} />
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onChange(currentPage + 1)}
        >
          Selanjutnya
        </button>
      </div>
    </div>
  )
}

function Actor({ actor }) {
  if (!actor) return <span className="sid-activity-log-muted">Sistem</span>

  return (
    <>
      <span>{actor.name}</span>
      {actor.role_label && <small className="sid-admin-cell-meta">{actor.role_label}</small>}
    </>
  )
}

function ChangeList({ log }) {
  if (log.event === 'imported' && log.summary) {
    return (
      <span>
        {log.summary.success_count} berhasil, {log.summary.error_count} gagal dari{' '}
        {log.summary.total_rows} baris
      </span>
    )
  }

  const entries = Object.entries(log.changes ?? {})

  if (!entries.length) return <span className="sid-activity-log-muted">—</span>

  return (
    <ul className="sid-activity-log-changes">
      {entries.map(([field, change]) => (
        <li key={field}>
          <strong>{fieldLabel(field)}:</strong> {formatChangeValue(change?.old)} →{' '}
          {formatChangeValue(change?.new)}
        </li>
      ))}
    </ul>
  )
}

function DateRangeFields({ from, to, onChange }) {
  return (
    <>
      <div className="sid-operator-filter-field">
        <p>Dari tanggal</p>
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => onChange('from', e.target.value)}
        />
      </div>
      <div className="sid-operator-filter-field">
        <p>Sampai tanggal</p>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => onChange('to', e.target.value)}
        />
      </div>
    </>
  )
}

function PopulationTab({ params, setParam }) {
  const filters = {
    type: params.get('type') ?? '',
    event: params.get('event') ?? '',
    subject_id: params.get('subject') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    page: Number(params.get('page') ?? 1),
  }

  const { data, isPending, isError } = useQuery({
    queryKey: ['activity-logs', 'population', filters],
    queryFn: () => getPopulationLogs(filters),
    placeholderData: keepPreviousData,
  })

  const logs = data?.data ?? []
  const meta = data?.meta ?? EMPTY_META

  return (
    <>
      <div className="sid-operator-filter-card">
        <div className="sid-operator-filter-grid sid-activity-log-filters">
          <div className="sid-operator-filter-field">
            <p>Jenis data</p>
            <select value={filters.type} onChange={(e) => setParam('type', e.target.value)}>
              <option value="">Semua</option>
              {POPULATION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sid-operator-filter-field">
            <p>Aksi</p>
            <select value={filters.event} onChange={(e) => setParam('event', e.target.value)}>
              <option value="">Semua aksi</option>
              {POPULATION_EVENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <DateRangeFields from={filters.from} to={filters.to} onChange={setParam} />
        </div>

        {filters.subject_id && (
          <p className="sid-activity-log-subject-filter">
            Menampilkan riwayat satu data saja.
            <button type="button" onClick={() => setParam('subject', '')}>
              <X size={14} /> Tampilkan semua
            </button>
          </p>
        )}
      </div>

      <div className="sid-operator-table-card">
        <div className="sid-operator-table-wrapper">
          <table className="sid-operator-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Petugas</th>
                <th>Aksi</th>
                <th>Data</th>
                <th>Perubahan</th>
              </tr>
            </thead>
            <tbody>
              {isPending ? (
                <tr>
                  <td colSpan={5} className="sid-operator-table-message">
                    Memuat riwayat...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="sid-operator-table-message">
                    Gagal memuat riwayat data kependudukan.
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="sid-operator-table-message">
                    Belum ada riwayat perubahan.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="sid-activity-log-time">{formatDateTime(log.created_at)}</td>
                    <td>
                      <Actor actor={log.actor} />
                    </td>
                    <td>
                      <span>{POPULATION_EVENT_LABELS[log.event] ?? log.event}</span>
                      {log.event === 'letter_fulfilled' && log.letter_number && (
                        <small className="sid-admin-cell-meta">Surat {log.letter_number}</small>
                      )}
                      {log.source === 'import' && log.event === 'created' && (
                        <small className="sid-admin-cell-meta">dari impor Excel</small>
                      )}
                    </td>
                    <td>
                      <span>{log.subject_label ?? '-'}</span>
                      <small className="sid-admin-cell-meta">
                        {log.log_name === 'family' ? 'Kartu Keluarga' : 'Warga'}
                      </small>
                    </td>
                    <td>
                      <ChangeList log={log} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination meta={meta} onChange={(page) => setParam('page', String(page), false)} />
      </div>
    </>
  )
}

function LetterTab({ params, setParam }) {
  const filters = {
    new_status: params.get('status') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    page: Number(params.get('page') ?? 1),
  }

  const { data, isPending, isError } = useQuery({
    queryKey: ['activity-logs', 'letters', filters],
    queryFn: () => getLetterActivityLogs(filters),
    placeholderData: keepPreviousData,
  })

  const logs = data?.data ?? []
  const meta = data?.meta ?? EMPTY_META

  return (
    <>
      <div className="sid-operator-filter-card">
        <div className="sid-operator-filter-grid sid-activity-log-filters">
          <div className="sid-operator-filter-field">
            <p>Status baru</p>
            <select value={filters.new_status} onChange={(e) => setParam('status', e.target.value)}>
              <option value="">Semua status</option>
              {SURAT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <DateRangeFields from={filters.from} to={filters.to} onChange={setParam} />
        </div>
      </div>

      <div className="sid-operator-table-card">
        <div className="sid-operator-table-wrapper">
          <table className="sid-operator-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Surat</th>
                <th>Oleh</th>
                <th>Status</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {isPending ? (
                <tr>
                  <td colSpan={5} className="sid-operator-table-message">
                    Memuat riwayat...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="sid-operator-table-message">
                    Gagal memuat riwayat surat.
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="sid-operator-table-message">
                    Belum ada riwayat surat.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="sid-activity-log-time">{formatDateTime(log.created_at)}</td>
                    <td>
                      {log.letter ? (
                        <>
                          <Link
                            to={`/admin/operator-desa/surat?surat=${encodeURIComponent(log.letter.id)}`}
                          >
                            {log.letter.letter_number
                              ? `#${log.letter.letter_number}`
                              : 'Lihat surat'}
                          </Link>
                          <small className="sid-admin-cell-meta">
                            {[log.letter.letter_type, log.letter.applicant_name]
                              .filter(Boolean)
                              .join(' · ')}
                          </small>
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <Actor actor={log.actor} />
                    </td>
                    <td>
                      {log.old_status && log.old_status !== log.new_status
                        ? `${STATUS_LABELS[log.old_status] ?? log.old_status} → `
                        : ''}
                      {STATUS_LABELS[log.new_status] ?? log.new_status}
                    </td>
                    <td>{log.reason || <span className="sid-activity-log-muted">—</span>}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination meta={meta} onChange={(page) => setParam('page', String(page), false)} />
      </div>
    </>
  )
}

export default function ActivityLogPage() {
  const [params, setParams] = useSearchParams()
  const activeTab = params.get('tab') === 'surat' ? 'surat' : 'penduduk'

  // Setiap perubahan filter kembali ke halaman 1.
  const setParam = (key, value, resetPage = true) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value) next.set(key, value)
        else next.delete(key)
        if (resetPage) next.delete('page')

        return next
      },
      { replace: true },
    )
  }

  const switchTab = (tab) => setParams({ tab }, { replace: true })

  return (
    <div className="sid-operator-page">
      <div className="sid-operator-content">
        <p className="sid-operator-breadcrumb">
          Admin / <span>Log Aktivitas</span>
        </p>
        <div className="sid-operator-header mb-0">
          <h1>Log Aktivitas</h1>
        </div>
        <p className="sid-page-description">
          Riwayat perubahan data warga & Kartu Keluarga oleh petugas, dan riwayat status setiap
          surat. NIK, No. KK, dan alamat KK disamarkan.
        </p>

        <div className="sid-wilayah-tabs" role="tablist" aria-label="Jenis log">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={tab.value === activeTab}
              className={`sid-wilayah-tab${tab.value === activeTab ? ' sid-wilayah-tab-active' : ''}`}
              onClick={() => switchTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'surat' ? (
          <LetterTab params={params} setParam={setParam} />
        ) : (
          <PopulationTab params={params} setParam={setParam} />
        )}
      </div>

      <SiteFooter />
    </div>
  )
}
