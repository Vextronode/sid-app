import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { getCitizens } from '@/features/data-warga/api'
import FamilyManagementPanel from '@/features/data-warga/components/FamilyManagementPanel'
import { WilayahFilterSelects } from '@/features/data-warga/components/WilayahFilterSelects'
import { useFamilyList } from '@/features/data-warga/hooks/useFamilyList'
import { useWilayahFilter, wilayahFilterLevels } from '@/features/data-warga/hooks/useWilayahFilter'
import { useDebouncedValue } from '@/features/surat/hooks/useSuratListQuery'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { PageNumbers } from '@/components/ui/PageNumbers'
import { PageSizeSelect } from '@/components/ui/PageSizeSelect'
import { formatPageRange } from '@/components/ui/pageRange'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { usePageSize } from '@/components/ui/usePageSize'
import { FAMILY_ROLE_LABELS, labelOf } from '@/shared/lib/labels'
import { RevealableValue } from '@/components/ui/RevealableValue'
import { revealCitizenNik } from '@/shared/lib/identityApi'
import { FamilyNumberValue } from '@/features/data-warga/components/FamilyNumberValue'
import type { Citizen } from '@/types'

// Bagian halaman sama dengan halaman kelola (DataWargaPage): tab Data
// Penduduk dan Kartu Keluarga, aktif di ?tab=.
const SECTIONS = [
  { value: 'penduduk', label: 'Data Penduduk' },
  { value: 'kk', label: 'Kartu Keluarga' },
]

// Peran pembaca yang cakupannya hanya wilayahnya sendiri.
const AREA_ROLES = ['rt', 'rw', 'kadus']

/**
 * Data penduduk dan KK khusus-baca untuk Kaur TU & Umum (bahan pertimbangan
 * saat memproses surat; perubahan datanya hanya lewat aksi "Terapkan" pada
 * surat), Kepala Desa, Sekretaris Desa, Kepala Dusun, RW, dan RT. Isi
 * daftar dibatasi backend ke cakupan peran (PopulationScope); filter
 * wilayah hanya menampilkan tingkat di bawah wilayah peran. Tambah, ubah,
 * hapus, dan impor ada di halaman kelola Staf SIDUTama dan Kasi Pemerintahan.
 */
export default function DataWargaReadOnlyPage() {
  const { user } = useAuth()
  const filterLevels = wilayahFilterLevels(user?.role)
  const [searchParams, setSearchParams] = useSearchParams()
  const activeSection = searchParams.get('tab') === 'kk' ? 'kk' : 'penduduk'
  const switchSection = (value: string) =>
    setSearchParams(value === 'penduduk' ? {} : { tab: value }, { replace: true })
  const familyList = useFamilyList()
  const [citizens, setCitizens] = useState<Citizen[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = usePageSize('data-penduduk')
  const [totalItems, setTotalItems] = useState(0)
  // Filter bertingkat Dusun -> RW -> RT; mengubahnya kembali ke halaman 1.
  const wilayahFilter = useWilayahFilter(() => setPage(1))
  const { params: wilayahParams } = wilayahFilter
  // Dinaikkan tombol Refresh untuk memuat ulang halaman warga yang sama.
  const [reloadKey, setReloadKey] = useState(0)

  const search = useDebouncedValue(keyword.trim())

  // Pencarian nama dan pagination diproses di server.
  useEffect(() => {
    let active = true

    getCitizens({ page, per_page: pageSize, ...(search ? { search } : {}), ...wilayahParams })
      .then((response) => {
        if (!active) return

        setCitizens(response.data?.data ?? [])
        setTotalItems(response.data?.meta?.total ?? response.data?.total ?? 0)
        setError('')
      })
      .catch((requestError) => {
        if (active) setError(requestError?.response?.data?.message || 'Gagal memuat data warga.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [page, pageSize, search, wilayahParams, reloadKey])

  const refreshCitizens = () => {
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  const setPageSize = (value: number) => {
    setPageSizeState(value)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentPage = Math.min(page, totalPages)
  const data = citizens

  return (
    <div className="sid-operator-page">
      <div className="sid-operator-content">
        <div className="sid-operator-header">
          <div>
            <h1>Data Penduduk &amp; Kartu Keluarga</h1>
            <p>
              {user?.role === 'kaur_tu_umum'
                ? 'Halaman ini hanya untuk melihat data. Perubahan data warga dilakukan lewat tombol Terapkan pada surat yang sudah disetujui.'
                : `Halaman ini hanya untuk melihat data warga dan Kartu Keluarga ${
                    AREA_ROLES.includes(user?.role ?? '') ? 'di wilayah Anda' : 'seluruh desa'
                  }.`}
            </p>
          </div>
          {/* Memuat ulang tab yang sedang dibuka. */}
          {activeSection === 'kk' ? (
            <RefreshButton onRefresh={familyList.reload} />
          ) : (
            <RefreshButton onRefresh={refreshCitizens} refreshing={loading} />
          )}
        </div>

        <div className="sid-wilayah-tabs" role="tablist" aria-label="Pilih bagian data">
          {SECTIONS.map((section) => (
            <button
              key={section.value}
              id={`data-tab-${section.value}`}
              type="button"
              role="tab"
              aria-selected={section.value === activeSection}
              aria-controls={`data-panel-${section.value}`}
              className={`sid-wilayah-tab${section.value === activeSection ? ' sid-wilayah-tab-active' : ''}`}
              onClick={() => switchSection(section.value)}
            >
              {section.label}
            </button>
          ))}
        </div>

        {activeSection === 'kk' && (
          <div id="data-panel-kk" role="tabpanel" aria-labelledby="data-tab-kk">
            <FamilyManagementPanel
              familyList={familyList}
              canEdit={false}
              canViewHistory={false}
              filterLevels={filterLevels}
            />
          </div>
        )}

        {activeSection === 'penduduk' && (
          <div id="data-panel-penduduk" role="tabpanel" aria-labelledby="data-tab-penduduk">
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
                      placeholder="Cari NIK (16 digit) atau nama warga..."
                      aria-label="Cari NIK (16 digit) atau nama warga"
                    />
                  </div>
                </div>

                <WilayahFilterSelects {...wilayahFilter} levels={filterLevels} />
              </form>
            </div>

            <div className="sid-operator-table-card">
              <div className="sid-operator-table-wrapper">
                <table className="sid-operator-table">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th className="center">NIK</th>
                      <th className="center">Dusun</th>
                      <th className="center">RT/RW</th>
                      <th className="center">Jenis Kelamin</th>
                      <th className="center">Tempat, Tanggal Lahir</th>
                      <th className="center">No. KK</th>
                      <th className="center">Peran KK</th>
                      <th className="center">Pekerjaan</th>
                      <th>Alamat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="empty">
                          Memuat data...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={10} className="empty sid-admin-error" role="alert">
                          {error}
                        </td>
                      </tr>
                    ) : data.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="empty">
                          Tidak ada data warga.
                        </td>
                      </tr>
                    ) : (
                      data.map((warga) => (
                        <tr key={warga.id}>
                          <td className="primary-text">{warga.name}</td>
                          <td className="center">
                            <RevealableValue
                              masked={warga.nik_masked}
                              reveal={() => revealCitizenNik(warga.id)}
                            />
                          </td>
                          <td className="center">
                            {warga.rw?.hamlet?.name ?? warga.hamlet?.name ?? '-'}
                          </td>
                          <td className="center sid-nowrap">
                            {/* Judul kolom sudah "RT/RW": cukup nomornya, satu baris. */}
                            {warga.rt?.number ?? '-'}/{warga.rw?.number ?? '-'}
                          </td>
                          <td className="center">
                            {warga.gender === 'L'
                              ? 'Laki-Laki'
                              : warga.gender === 'P'
                                ? 'Perempuan'
                                : '-'}
                          </td>
                          <td>
                            {[
                              warga.place_of_birth,
                              warga.date_of_birth
                                ? new Date(warga.date_of_birth).toLocaleDateString('id-ID')
                                : null,
                            ]
                              .filter(Boolean)
                              .join(', ') || '-'}
                          </td>
                          <td className="center">
                            <FamilyNumberValue family={warga.family} />
                          </td>
                          <td className="center">
                            {labelOf(FAMILY_ROLE_LABELS, warga.family_role)}
                          </td>
                          <td className="center">{warga.occupation ?? '-'}</td>
                          <td>{warga.address ?? '-'}</td>
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
                    <PageNumbers
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onChange={setPage}
                    />
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
        )}
      </div>
      <SiteFooter />
    </div>
  )
}
