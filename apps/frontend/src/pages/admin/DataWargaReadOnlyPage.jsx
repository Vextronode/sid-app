import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { getCitizens } from '@/features/data-warga/api'
import { useDebouncedValue } from '@/features/surat/hooks/useSuratListQuery'
import { SiteFooter } from '@/components/layout/SiteFooter'

const ITEMS_PER_PAGE = 10

/**
 * Daftar warga khusus-baca untuk Kasi/Kaur sebagai bahan pertimbangan
 * saat memproses surat. Perubahan data oleh Kasi/Kaur hanya lewat aksi
 * "Terapkan" pada surat; tambah, ubah, hapus, dan impor tetap di halaman
 * Petugas Desa.
 */
export default function DataWargaReadOnlyPage() {
  const [citizens, setCitizens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const search = useDebouncedValue(keyword.trim())

  // Pencarian nama dan pagination diproses di server.
  useEffect(() => {
    let active = true

    getCitizens({ page, per_page: ITEMS_PER_PAGE, ...(search ? { search } : {}) })
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
  }, [page, search])

  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const data = citizens

  return (
    <div className="sid-operator-page">
      <div className="sid-operator-content">
        <p className="sid-operator-breadcrumb">
          Admin / <span>Data Penduduk</span>
        </p>

        <div className="sid-operator-header">
          <h1>Data Penduduk</h1>
        </div>

        <p className="sid-admin-alert" role="note">
          Halaman ini hanya untuk melihat data. Perubahan data warga dilakukan lewat tombol Terapkan
          pada surat yang sudah disetujui.
        </p>

        <div className="sid-operator-filter-card">
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
                placeholder="Cari nama warga..."
                aria-label="Cari nama warga"
              />
            </div>
          </div>
        </div>

        <div className="sid-operator-table-card">
          <div className="sid-operator-table-wrapper">
            <table className="sid-operator-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th className="center">NIK</th>
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
                    <td colSpan={9} className="empty">
                      Memuat data...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={9} className="empty sid-admin-error" role="alert">
                      {error}
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty">
                      Tidak ada data warga.
                    </td>
                  </tr>
                ) : (
                  data.map((warga) => (
                    <tr key={warga.id}>
                      <td className="primary-text">{warga.name}</td>
                      <td className="center">{warga.nik_masked ?? '-'}</td>
                      <td className="center">
                        RT {warga.rt?.number ?? '-'} / RW {warga.rw?.number ?? '-'}
                      </td>
                      <td className="center">
                        {warga.gender === 'L'
                          ? 'Laki-Laki'
                          : warga.gender === 'P'
                            ? 'Perempuan'
                            : '-'}
                      </td>
                      <td className="center">
                        {[
                          warga.place_of_birth,
                          warga.date_of_birth
                            ? new Date(warga.date_of_birth).toLocaleDateString('id-ID')
                            : null,
                        ]
                          .filter(Boolean)
                          .join(', ') || '-'}
                      </td>
                      <td className="center">{warga.family?.no_kk_masked ?? '-'}</td>
                      <td className="center">{warga.family_role?.replaceAll('_', ' ') ?? '-'}</td>
                      <td className="center">{warga.occupation ?? '-'}</td>
                      <td>{warga.address ?? '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="sid-operator-pagination">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Sebelumnya
              </button>
              <span>
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                Berikutnya
              </button>
            </div>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  )
}
