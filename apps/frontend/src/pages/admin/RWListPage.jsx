/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */

// ==========================================
// RWListPage.jsx
// Daftar permohonan surat RW
// Styling menggunakan SID Global Theme.
// ==========================================

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';

import { useSuratList } from '@/features/approval-rw/hooks/useSuratListRW';
import { useApprovalAction } from '@/features/approval-rw/hooks/useApprovalActionRW';
import SuratDetailModalRW from '@/features/approval-rw/components/SuratDetailModalRW';
import StatusBadgeRT from '@/features/approval-rt/components/StatusBadgeRT';
import { BASE_PATH } from '@/features/approval-rw/constants/roleConfigRW';

import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FooterDesa } from '@/components/layout/FooterDesa';
import { ADMIN_MOBILE_LINKS } from '@/lib/constants/navigation';

const ITEMS_PER_PAGE = 5;

export default function RWListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialStatus = searchParams.get('status') ?? '';

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const {
    data,
    loading,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    refresh,
  } = useSuratList({ initialStatus });

  const { approve, reject } = useApprovalAction();


  // ==========================================
  // AUTO REFRESH DATA SURAT
  // ==========================================

  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [refresh]);


  // ==========================================
  // RESET PAGINATION
  // ==========================================

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus]);


  // ==========================================
  // PAGINATION
  // ==========================================

  const totalPages = Math.max(
    1,
    Math.ceil(data.length / ITEMS_PER_PAGE)
  );

  const paginatedData = useMemo(() => {
    const start =
      (currentPage - 1) * ITEMS_PER_PAGE;

    return data.slice(
      start,
      start + ITEMS_PER_PAGE
    );
  }, [data, currentPage]);


  // ==========================================
  // APPROVE
  // ==========================================

  const handleApprove = async () => {
    try {
      await approve(selectedId);

      await refresh();

      setSelectedId(null);
      setIsReadOnly(false);
    } catch (error) {
      console.error(
        'Gagal approve surat:',
        error
      );
    }
  };


  // ==========================================
  // REJECT
  // ==========================================

  const handleReject = async (alasan) => {
    try {
      await reject(selectedId, alasan);

      await refresh();

      setSelectedId(null);
      setIsReadOnly(false);
    } catch (error) {
      console.error(
        'Gagal reject surat:',
        error
      );
    }
  };


  // ==========================================
  // BUKA DETAIL
  // ==========================================

  const handleOpenDetail = (surat) => {
    setSelectedId(surat.id);
    setIsReadOnly(surat.status !== 'rt_approved');
  };


  return (
    <>
      {/* ========================================
          DESKTOP
          ======================================== */}

      <div className="rw-page-desktop">

        <div className="sid-page rw-page-content">

          {/* ======================================
              HEADER
              ====================================== */}

          <p className="rw-breadcrumb">
            Admin /{' '}
            <span>
              Daftar Permohonan Surat
            </span>
          </p>

          <h1 className="sid-page-title">
            Daftar Permohonan Surat
          </h1>

          <p className="sid-page-description">
            Kelola dan proses permohonan surat warga
            yang masuk ke wilayah RW.
          </p>


          {/* ======================================
              FILTER
              ====================================== */}

          <div className="sid-card rw-filter-card">

            <div className="rw-filter-grid">

              {/* PENCARIAN */}

              <div>
                <p className="rw-filter-label">
                  Pencarian Cepat
                </p>

                <div className="rw-search-wrapper">
                  <Search
                    size={16}
                    className="sid-search-icon"
                  />

                  <input
                    type="text"
                    defaultValue={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    placeholder="Nomor surat atau nama pemohon..."
                    className="sid-search-input"
                  />
                </div>
              </div>


              {/* STATUS */}

              <div>
                <p className="rw-filter-label">
                  Status
                </p>

                <select
                  value={filterStatus}
                  onChange={(e) =>
                    setFilterStatus(e.target.value)
                  }
                  className="sid-select rw-status-select"
                >
                  <option value="">
                    Semua Status
                  </option>

                  <option value="rt_approved">
                    Menunggu
                  </option>

                  <option value="rw_approved">
                    Disetujui
                  </option>

                  <option value="rw_rejected">
                    Ditolak
                  </option>
                </select>
              </div>

            </div>
          </div>


          {/* ======================================
              TABLE
              ====================================== */}

          <div className="sid-card rw-table-card">

            <table className="rw-table">

              <thead>
                <tr className="rw-table-header">

                  <th>
                    No. Surat
                  </th>

                  <th>
                    Pemohon
                  </th>

                  <th>
                    Jenis
                  </th>

                  <th>
                    Tanggal
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Aksi
                  </th>

                </tr>
              </thead>


              <tbody>

                {loading ? (

                  <tr>
                    <td
                      colSpan={6}
                      className="rw-table-message"
                    >
                      Memuat data surat...
                    </td>
                  </tr>

                ) : paginatedData.length === 0 ? (

                  <tr>
                    <td
                      colSpan={6}
                      className="rw-table-message"
                    >
                      Belum ada surat.
                    </td>
                  </tr>

                ) : (

                  paginatedData.map((s) => (

                    <tr
                      key={s.id}
                      className="rw-table-row"
                    >

                      {/* NO SURAT */}

                      <td className="rw-letter-number">
                        #{s.letter_number ?? '-'}
                      </td>


                      {/* PEMOHON */}

                      <td className="rw-table-center">
                        {s.applicant_name}
                      </td>


                      {/* JENIS */}

                      <td className="rw-table-center">
                        {s.letter_type?.name ?? '-'}
                      </td>


                      {/* TANGGAL */}

                      <td className="rw-table-date">
                        {s.submitted_at
                          ? new Date(
                              s.submitted_at
                            ).toLocaleDateString(
                              'id-ID',
                              {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              }
                            )
                          : '-'}
                      </td>


                      {/* STATUS */}

                      <td className="rw-table-center">
                        <StatusBadgeRT
                          status={s.status}
                        />
                      </td>


                      {/* AKSI */}

                      <td className="rw-table-center">

                        <button
                          type="button"
                          onClick={() =>
                            handleOpenDetail(s)
                          }
                          className="rw-action-button"
                        >
                          {s.status === 'rt_approved'
                            ? 'Proses'
                            : 'Lihat'}
                        </button>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>


            {/* ==================================
                PAGINATION DESKTOP
                ================================== */}

            <div className="rw-pagination">

              <p className="rw-pagination-info">
                Menampilkan{' '}
                {paginatedData.length === 0
                  ? 0
                  : (currentPage - 1) *
                      ITEMS_PER_PAGE +
                    1}
                -
                {(currentPage - 1) *
                  ITEMS_PER_PAGE +
                  paginatedData.length}{' '}
                dari {data.length} data
              </p>


              <div className="rw-pagination-buttons">

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.max(1, p - 1)
                    )
                  }
                  disabled={currentPage === 1}
                  className="rw-pagination-nav"
                >
                  Sebelumnya
                </button>


                {Array.from(
                  { length: totalPages },
                  (_, i) => i + 1
                ).map((page) => (

                  <button
                    key={page}
                    type="button"
                    onClick={() =>
                      setCurrentPage(page)
                    }
                    className={`rw-pagination-page ${
                      page === currentPage
                        ? 'rw-pagination-page-active'
                        : ''
                    }`}
                  >
                    {page}
                  </button>

                ))}


                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(
                        totalPages,
                        p + 1
                      )
                    )
                  }
                  disabled={
                    currentPage === totalPages
                  }
                  className="rw-pagination-nav"
                >
                  Selanjutnya
                </button>

              </div>

            </div>

          </div>

        </div>


        {/* FOOTER */}

        <FooterDesa />

      </div>


      {/* ========================================
          MOBILE
          ======================================== */}

      <div className="rw-page-mobile">

        <div className="sid-page rw-mobile-content">

          {/* HEADER */}

          <h1 className="sid-page-title">
            Semua Surat
          </h1>

          <p className="sid-page-description">
            Kelola permohonan surat warga secara digital.
          </p>


          {/* SEARCH */}

          <div className="rw-mobile-search">
            <Search
              size={16}
              className="sid-search-icon"
            />

            <input
              type="text"
              defaultValue={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Cari nama pemohon..."
              className="sid-search-input"
            />
          </div>


          {/* FILTER STATUS */}

          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value)
            }
            className="sid-select rw-mobile-status-select"
          >
            <option value="">
              Semua Status
            </option>

            <option value="rt_approved">
              Menunggu
            </option>

            <option value="rw_approved">
              Disetujui RW
            </option>

            <option value="rw_rejected">
              Ditolak RW
            </option>
          </select>


          {/* MOBILE TABLE */}

          <div className="sid-card rw-mobile-table-card">

            <div className="rw-mobile-table-header">

              <span>
                No.Surat
              </span>

              <span>
                Pemohon
              </span>

              <span>
                Jenis
              </span>

              <span>
                Tanggal
              </span>

            </div>


            {loading ? (

              <p className="rw-mobile-message">
                Memuat...
              </p>

            ) : paginatedData.length === 0 ? (

              <p className="rw-mobile-message">
                Belum ada surat.
              </p>

            ) : (

              paginatedData.map((s) => (

                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    handleOpenDetail(s)
                  }
                  className="rw-mobile-row"
                >

                  <span>
                    {s.letter_number ?? '-'}
                  </span>

                  <span className="rw-mobile-applicant">
                    {s.applicant_name}
                  </span>

                  <span>
                    {s.letter_type?.name ?? '-'}
                  </span>

                  <span className="rw-mobile-date">
                    {s.submitted_at
                      ? new Date(
                          s.submitted_at
                        ).toLocaleDateString(
                          'id-ID'
                        )
                      : '-'}
                  </span>

                </button>

              ))

            )}

          </div>


          {/* MOBILE PAGINATION */}

          <div className="rw-mobile-pagination">

            {Array.from(
              { length: totalPages },
              (_, i) => i + 1
            ).map((page) => (

              <button
                key={page}
                type="button"
                onClick={() =>
                  setCurrentPage(page)
                }
                className={`rw-mobile-page-button ${
                  page === currentPage
                    ? 'rw-mobile-page-button-active'
                    : ''
                }`}
              >
                {page}
              </button>

            ))}

          </div>

        </div>


        {/* FOOTER */}

        <div className="sid-mobile-footer">
          <FooterDesa />
        </div>


        {/* MOBILE NAV */}

        <MobileBottomNav
          links={ADMIN_MOBILE_LINKS(
            '/admin/dashboard-surat-rw',
            '/admin/list-rw'
          )}
        />

      </div>


      {/* ========================================
          DETAIL MODAL
          ======================================== */}

      <SuratDetailModalRW
        suratId={selectedId}
        onClose={() => {
          setSelectedId(null);
          setIsReadOnly(false);
        }}
        onApprove={handleApprove}
        onReject={handleReject}
        readOnly={isReadOnly}
      />

    </>
  );
}