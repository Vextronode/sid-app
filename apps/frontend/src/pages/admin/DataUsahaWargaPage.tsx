import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { getCitizenBusinesses } from '@/features/data-usaha/api'
import type { CitizenBusiness, CitizenBusinessListParams } from '@/features/data-usaha/api'
import { DATA_USAHA_ROUTE } from '@/features/data-usaha/components/CitizenBusinessAccessGate'
import {
  BUSINESS_CATEGORY_OPTIONS,
  CIMART_STATUS_OPTIONS,
  cimartStatusTone,
  LETTER_STATUS_OPTIONS,
} from '@/features/data-usaha/constants'
import { useDebouncedValue } from '@/features/surat/hooks/useSuratListQuery'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { PageNumbers } from '@/components/ui/PageNumbers'
import { PageSizeSelect } from '@/components/ui/PageSizeSelect'
import { formatPageRange } from '@/components/ui/pageRange'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { StatusPill } from '@/components/ui/StatusPill'
import { usePageSize } from '@/components/ui/usePageSize'
import { getApiErrorMessage } from '@/shared/lib/apiError'

type Filters = Pick<CitizenBusinessListParams, 'category' | 'letter_status' | 'cimart_status'>

/**
 * Data Usaha Warga, khusus-baca: usaha dari SKU yang terbit beserta status
 * pendaftaran Cimart-nya. Untuk Staf SIDUTama dan petugas SKU. Data usaha
 * hanya berubah lewat SKU baru; tidak ada tombol ubah atau hapus.
 */
export default function DataUsahaWargaPage() {
  const [businesses, setBusinesses] = useState<CitizenBusiness[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [filters, setFilters] = useState<Filters>({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = usePageSize('data-usaha')
  const [totalItems, setTotalItems] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)

  const search = useDebouncedValue(keyword.trim())

  useEffect(() => {
    let active = true

    getCitizenBusinesses({
      page,
      per_page: pageSize,
      ...(search ? { search } : {}),
      ...filters,
    })
      .then((response) => {
        if (!active) return

        setBusinesses(response.data ?? [])
        setTotalItems(response.meta?.total ?? response.total ?? 0)
        setError('')
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, 'Gagal memuat data usaha.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [page, pageSize, search, filters, reloadKey])

  const updateFilter = <K extends keyof Filters>(key: K, value: string) => {
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
            <h1>Data Usaha Warga</h1>
            <p>
              Usaha warga dari Surat Keterangan Usaha yang sudah terbit, beserta status pendaftaran
              pedagang Cimart. Halaman ini hanya untuk melihat data; perubahan data usaha dilakukan
              warga dengan mengajukan SKU baru.
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
                  placeholder="Cari nama usaha atau nama warga..."
                  aria-label="Cari nama usaha atau nama warga"
                />
              </div>
            </div>

            <div className="sid-operator-filter-field">
              <p>Kategori</p>
              <select
                aria-label="Filter kategori usaha"
                value={filters.category ?? ''}
                onChange={(event) => updateFilter('category', event.target.value)}
              >
                <option value="">Semua kategori</option>
                {BUSINESS_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sid-operator-filter-field">
              <p>Status SKU</p>
              <select
                aria-label="Filter status SKU"
                value={filters.letter_status ?? ''}
                onChange={(event) => updateFilter('letter_status', event.target.value)}
              >
                <option value="">Semua status</option>
                {LETTER_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sid-operator-filter-field">
              <p>Status Cimart</p>
              <select
                aria-label="Filter status Cimart"
                value={filters.cimart_status ?? ''}
                onChange={(event) => updateFilter('cimart_status', event.target.value)}
              >
                <option value="">Semua status</option>
                {CIMART_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
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
                  <th>Nama Usaha</th>
                  <th>Pemilik</th>
                  <th className="center">Kategori</th>
                  <th>Kegiatan Usaha</th>
                  <th className="center">Status SKU</th>
                  <th className="center">Status Cimart</th>
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
                    <td colSpan={6} className="empty sid-admin-error" role="alert">
                      {error}
                    </td>
                  </tr>
                ) : businesses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty">
                      Tidak ada data usaha.
                    </td>
                  </tr>
                ) : (
                  businesses.map((business) => (
                    <tr key={business.id}>
                      <td className="primary-text">
                        <Link to={`${DATA_USAHA_ROUTE}/${business.id}`}>
                          {business.business_name}
                        </Link>
                      </td>
                      <td>{business.citizen?.name ?? '-'}</td>
                      <td className="center">{business.category_label}</td>
                      <td>{business.business_activity}</td>
                      <td className="center">
                        <StatusPill
                          tone={business.letter_status === 'berlaku' ? 'active' : 'danger'}
                        >
                          {business.letter_status === 'berlaku' ? 'Berlaku' : 'Kedaluwarsa'}
                        </StatusPill>
                      </td>
                      <td className="center">
                        <StatusPill tone={cimartStatusTone(business.cimart_status)}>
                          {business.cimart_status_label}
                        </StatusPill>
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
    </div>
  )
}
