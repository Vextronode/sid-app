import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Search } from 'lucide-react'
import { getMigrantWorkers } from '@/features/data-cpmi/api'
import { CpmiLetterModal } from '@/features/data-cpmi/components/CpmiLetterModal'
import type { MigrantWorkerListParams, MigrantWorkerSummary } from '@/features/data-cpmi/api'
import { DATA_CPMI_ROUTE } from '@/features/data-cpmi/components/MigrantWorkerAccessGate'
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_OPTIONS,
  contractStatusTone,
  formatDate,
} from '@/features/data-cpmi/constants'
import { getVillageAreas } from '@/features/surat/api/letterExtrasApi'
import type { VillageArea } from '@/features/surat/types'
import { useDebouncedValue } from '@/features/surat/hooks/useSuratListQuery'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { PageNumbers } from '@/components/ui/PageNumbers'
import { PageSizeSelect } from '@/components/ui/PageSizeSelect'
import { formatPageRange } from '@/components/ui/pageRange'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { StatusPill } from '@/components/ui/StatusPill'
import { usePageSize } from '@/components/ui/usePageSize'
import { getApiErrorMessage } from '@/shared/lib/apiError'

type Filters = Pick<
  MigrantWorkerListParams,
  'destination_country' | 'contract_status' | 'hamlet_id'
>

/**
 * Data CPMI, khusus-baca: warga yang didata akan bekerja ke luar negeri
 * (pengajuan F11 yang disetujui Kepala Desa), satu baris per keberangkatan.
 * Data hanya bertambah lewat pengajuan CPMI baru.
 */
export default function DataCpmiPage() {
  const [workers, setWorkers] = useState<MigrantWorkerSummary[]>([])
  // Pengajuan F11 yang dibuka di pop up rincian (sama dengan tampilan approver).
  const [openLetterId, setOpenLetterId] = useState<string | null>(null)
  const [countries, setCountries] = useState<string[]>([])
  const [hamlets, setHamlets] = useState<VillageArea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [filters, setFilters] = useState<Filters>({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = usePageSize('data-cpmi')
  const [totalItems, setTotalItems] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)

  const search = useDebouncedValue(keyword.trim())

  useEffect(() => {
    let active = true

    getVillageAreas()
      .then((tree) => {
        if (active) setHamlets(tree ?? [])
      })
      // Tanpa daftar dusun, filter dusun saja yang tidak tersedia.
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    getMigrantWorkers({
      page,
      per_page: pageSize,
      ...(search ? { search } : {}),
      ...filters,
    })
      .then((response) => {
        if (!active) return

        setWorkers(response.data ?? [])
        setCountries(response.filters?.countries ?? [])
        setTotalItems(response.meta?.total ?? response.total ?? 0)
        setError('')
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, 'Gagal memuat data CPMI.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [page, pageSize, search, filters, reloadKey])

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K] | undefined) => {
    setFilters((current) => ({ ...current, [key]: value || undefined }))
    setPage(1)
  }

  const setPageSize = (value: number) => {
    setPageSizeState(value)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentPage = Math.min(page, totalPages)

  return (
    <div className="sid-operator-page">
      <div className="sid-operator-content">
        <div className="sid-operator-header">
          <div>
            <h1>Data CPMI</h1>
            <p>
              Calon Pekerja Migran Indonesia dari pengajuan Pendataan CPMI yang sudah disetujui
              Kepala Desa. Satu baris untuk satu keberangkatan, jadi warga yang berangkat lebih dari
              sekali muncul beberapa kali. Halaman ini hanya untuk melihat data.
            </p>
          </div>
          <RefreshButton
            onRefresh={() => {
              setLoading(true)
              setReloadKey((key) => key + 1)
            }}
            refreshing={loading}
          />
        </div>

        <div className="sid-operator-filter-card">
          <form
            className="sid-operator-filter-grid warga-filter"
            onSubmit={(event) => event.preventDefault()}
          >
            <div className="sid-operator-filter-field">
              <p>Pencarian Cepat</p>
              <div className="sid-operator-search">
                <Search size={16} />
                <input
                  value={keyword}
                  onChange={(event) => {
                    setKeyword(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Cari nama warga, negara, perusahaan, atau P3MI..."
                  aria-label="Cari nama warga, negara, perusahaan, atau P3MI"
                />
              </div>
            </div>

            <div className="sid-operator-filter-field">
              <p>Negara Tujuan</p>
              <select
                aria-label="Filter negara tujuan"
                value={filters.destination_country ?? ''}
                onChange={(event) => updateFilter('destination_country', event.target.value)}
              >
                <option value="">Semua negara</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            <div className="sid-operator-filter-field">
              <p>Status Kontrak</p>
              <select
                aria-label="Filter status kontrak"
                value={filters.contract_status ?? ''}
                onChange={(event) =>
                  updateFilter(
                    'contract_status',
                    (event.target.value || undefined) as Filters['contract_status'],
                  )
                }
              >
                <option value="">Semua status</option>
                {CONTRACT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sid-operator-filter-field">
              <p>Dusun</p>
              <select
                aria-label="Filter dusun"
                value={filters.hamlet_id ?? ''}
                onChange={(event) =>
                  updateFilter(
                    'hamlet_id',
                    event.target.value ? Number(event.target.value) : undefined,
                  )
                }
              >
                <option value="">Semua dusun</option>
                {hamlets.map((hamlet) => (
                  <option key={hamlet.id} value={hamlet.id}>
                    {hamlet.name}
                  </option>
                ))}
              </select>
            </div>
          </form>
        </div>

        <div className="sid-operator-table-card">
          <div className="sid-operator-table-wrapper">
            <table className="sid-operator-table">
              <thead>
                <tr>
                  <th>Nama Warga</th>
                  <th>Dusun</th>
                  <th className="center">Negara Tujuan</th>
                  <th>Jabatan</th>
                  <th>P3MI / Sponsor</th>
                  <th>Masa Kontrak</th>
                  <th className="center">Status</th>
                  <th className="center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="empty">
                      Memuat data...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="empty sid-admin-error" role="alert">
                      {error}
                    </td>
                  </tr>
                ) : workers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty">
                      Tidak ada data CPMI.
                    </td>
                  </tr>
                ) : (
                  workers.map((worker) => (
                    <tr key={worker.id}>
                      <td className="primary-text">
                        <Link to={`${DATA_CPMI_ROUTE}/${worker.id}`}>
                          {worker.citizen?.name ?? '-'}
                        </Link>
                      </td>
                      <td>{worker.hamlet ?? '-'}</td>
                      <td className="center">{worker.destination_country}</td>
                      <td>{worker.position ?? '-'}</td>
                      <td>{worker.agency_name ?? 'Tanpa agensi'}</td>
                      <td>
                        {formatDate(worker.contract_start)} – {formatDate(worker.contract_end)}
                      </td>
                      <td className="center">
                        <StatusPill tone={contractStatusTone(worker.contract_status)}>
                          {CONTRACT_STATUS_LABELS[worker.contract_status]}
                        </StatusPill>
                      </td>
                      <td className="center">
                        <div className="sid-operator-actions">
                          <button
                            type="button"
                            title="Detail"
                            aria-label={`Detail pengajuan ${worker.citizen?.name ?? ''}`.trim()}
                            className="sid-operator-action detail"
                            onClick={() => setOpenLetterId(worker.letter_id)}
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalItems > 0 && (
            <div className="sid-operator-pagination">
              <div className="sid-pagination-meta">
                <p>{formatPageRange(currentPage, pageSize, totalItems)}</p>
                <PageSizeSelect value={pageSize} onChange={setPageSize} />
              </div>
              <div>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Sebelumnya
                </button>
                <PageNumbers currentPage={currentPage} totalPages={totalPages} onChange={setPage} />
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <SiteFooter />

      <CpmiLetterModal letterId={openLetterId} onClose={() => setOpenLetterId(null)} />
    </div>
  )
}
