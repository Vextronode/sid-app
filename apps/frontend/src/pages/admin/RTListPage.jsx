/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */

// ==========================================
// RTListPage.jsx
// Daftar Permohonan Surat RT
//
// Desktop:
// - Breadcrumb
// - Search + filter dalam SID Card
// - Tabel permohonan
// - Pagination
//
// Mobile:
// - Search
// - Filter
// - List surat
// - Pagination
// - Footer
// - Bottom Navigation
//
// Modal detail:
// SuratDetailModalRT
// ==========================================

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';

import { useSuratList } from '@/features/approval-rt/hooks/useSuratList';
import { useApprovalAction } from '@/features/approval-rt/hooks/useApprovalAction';

import SuratDetailModalRT from '@/features/approval-rt/components/SuratDetailModalRT';
import StatusBadgeRT from '@/features/approval-rt/components/StatusBadgeRT';

import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FooterDesa } from '@/components/layout/FooterDesa';

import { ADMIN_MOBILE_LINKS } from '@/lib/constants/navigation';


// ==========================================
// CONFIG
// ==========================================

const ITEMS_PER_PAGE = 5;


// ==========================================
// COMPONENT
// ==========================================

export default function RTListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialStatus = searchParams.get('status') ?? '';

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);


  // ==========================================
  // DATA
  // ==========================================

  const {
    data,
    loading,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    refresh,
  } = useSuratList({
    initialStatus,
  });


  const {
    approve,
    reject,
  } = useApprovalAction();


  // ==========================================
  // AUTO REFRESH
  // ==========================================

  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [refresh]);


  // ==========================================
  // RESET PAGE
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
      await reject(
        selectedId,
        alasan
      );

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
  // OPEN DETAIL
  // ==========================================

  const handleOpenDetail = (surat) => {
    setSelectedId(surat.id);

    setIsReadOnly(
      surat.status !== 'pending'
    );
  };


  // ==========================================
  // RENDER
  // ==========================================

  return (
    <>
      {/* ========================================
          DESKTOP
          ======================================== */}

      <div className="hidden md:block">

        <div className="sid-page max-w-5xl">

          {/* ======================================
              BREADCRUMB
              ====================================== */}

          <p className="
            text-xs
            text-[var(--sid-text-muted)]
            mb-1
          ">
            Admin /
            <span className="
              text-[var(--sid-text-secondary)]
            ">
              {' '}Daftar Permohonan Surat
            </span>
          </p>


          {/* ======================================
              TITLE
              ====================================== */}

          <h1 className="
            sid-page-title
            mb-6
          ">
            Daftar Permohonan Surat
          </h1>


          {/* ======================================
              SEARCH + FILTER
              ====================================== */}

          <div className="
            sid-card
            mb-6
          ">

            <div className="
              grid
              grid-cols-2
              gap-4
            ">

              {/* SEARCH */}

              <div>

                <p className="
                  text-[10px]
                  font-semibold
                  text-[var(--sid-text-secondary)]
                  uppercase
                  mb-1.5
                ">
                  Pencarian Cepat
                </p>

                <div className="sid-search">

                  <Search
                    size={16}
                    className="sid-search-icon"
                  />

                  <input
                    defaultValue={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    placeholder="
                      Nomor surat atau nama pemohon...
                    "
                    className="sid-search-input"
                  />

                </div>

              </div>


              {/* STATUS */}

              <div>

                <p className="
                  text-[10px]
                  font-semibold
                  text-[var(--sid-text-secondary)]
                  uppercase
                  mb-1.5
                ">
                  Status
                </p>

                <select
                  value={filterStatus}
                  onChange={(e) =>
                    setFilterStatus(e.target.value)
                  }
                  className="sid-search-input"
                >

                  <option value="">
                    Semua Status
                  </option>

                  <option value="pending">
                    Menunggu
                  </option>

                  <option value="rt_approved">
                    Disetujui RT
                  </option>

                  <option value="rt_rejected">
                    Ditolak RT
                  </option>

                </select>

              </div>

            </div>

          </div>


          {/* ======================================
              TABLE
              ====================================== */}

          <div className="
            sid-card
            p-0
            overflow-hidden
          ">

            <div className="overflow-x-auto">

              <table className="
                w-full
                text-sm
              ">

                {/* HEADER */}

                <thead>

                  <tr className="
                    border-b
                    border-[var(--sid-border)]
                  ">

                    <th className="
                      py-3
                      px-5
                      text-left
                      font-semibold
                      text-[10px]
                      uppercase
                      text-[var(--sid-text-secondary)]
                    ">
                      No. Surat
                    </th>

                    <th className="
                      py-3
                      px-5
                      text-center
                      font-semibold
                      text-[10px]
                      uppercase
                      text-[var(--sid-text-secondary)]
                    ">
                      Pemohon
                    </th>

                    <th className="
                      py-3
                      px-5
                      text-center
                      font-semibold
                      text-[10px]
                      uppercase
                      text-[var(--sid-text-secondary)]
                    ">
                      Jenis
                    </th>

                    <th className="
                      py-3
                      px-5
                      text-center
                      font-semibold
                      text-[10px]
                      uppercase
                      text-[var(--sid-text-secondary)]
                    ">
                      Tanggal
                    </th>

                    <th className="
                      py-3
                      px-5
                      text-center
                      font-semibold
                      text-[10px]
                      uppercase
                      text-[var(--sid-text-secondary)]
                    ">
                      Status
                    </th>

                    <th className="
                      py-3
                      px-5
                      text-center
                      font-semibold
                      text-[10px]
                      uppercase
                      text-[var(--sid-text-secondary)]
                    ">
                      Aksi
                    </th>

                  </tr>

                </thead>


                {/* BODY */}

                <tbody>

                  {loading ? (

                    <tr>

                      <td
                        colSpan={6}
                        className="
                          text-center
                          py-10
                          text-sm
                          text-[var(--sid-text-muted)]
                        "
                      >
                        Memuat data surat...
                      </td>

                    </tr>

                  ) : paginatedData.length === 0 ? (

                    <tr>

                      <td
                        colSpan={6}
                        className="
                          text-center
                          py-10
                          text-sm
                          text-[var(--sid-text-muted)]
                        "
                      >
                        Belum ada surat.
                      </td>

                    </tr>

                  ) : (

                    paginatedData.map((s) => (

                      <tr
                        key={s.id}
                        className="
                          border-b
                          last:border-0
                          border-[var(--sid-border)]
                          hover:bg-[var(--sid-surface-page)]
                          transition-colors
                        "
                      >

                        {/* NO SURAT */}

                        <td className="
                          py-4
                          px-5
                          font-semibold
                          text-[var(--sid-text-secondary)]
                        ">
                          #{s.letter_number ?? '-'}
                        </td>


                        {/* PEMOHON */}

                        <td className="
                          py-4
                          px-5
                          text-center
                          text-[var(--sid-text-secondary)]
                        ">
                          {s.applicant_name ?? '-'}
                        </td>


                        {/* JENIS */}

                        <td className="
                          py-4
                          px-5
                          text-center
                          text-[var(--sid-text-secondary)]
                        ">
                          {s.letter_type?.name ?? '-'}
                        </td>


                        {/* TANGGAL */}

                        <td className="
                          py-4
                          px-5
                          text-center
                          text-[var(--sid-text-secondary)]
                        ">
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

                        <td className="
                          py-4
                          px-5
                          text-center
                        ">
                          <StatusBadgeRT
                            status={s.status}
                          />
                        </td>


                        {/* AKSI */}

                        <td className="
                          py-4
                          px-5
                          text-center
                        ">

                          <button
                            onClick={() =>
                              handleOpenDetail(s)
                            }
                            className="
                              border
                              border-[var(--sid-border)]
                              rounded-[var(--radius-sm)]
                              px-3
                              py-1.5
                              text-xs
                              font-medium
                              text-[var(--sid-text-secondary)]
                              hover:bg-[var(--sid-surface-page)]
                              hover:border-[var(--sid-primary)]
                              hover:text-[var(--sid-primary)]
                              transition-colors
                            "
                          >
                            {s.status === 'pending'
                              ? 'Proses'
                              : 'Lihat'}
                          </button>

                        </td>

                      </tr>

                    ))

                  )}

                </tbody>

              </table>

            </div>


            {/* ======================================
                PAGINATION
                ====================================== */}

            <div className="
              flex
              items-center
              justify-between
              px-5
              py-4
              border-t
              border-[var(--sid-border)]
            ">

              <p className="
                text-xs
                text-[var(--sid-text-muted)]
              ">

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


              <div className="
                flex
                items-center
                gap-2
              ">

                <button
                  onClick={() =>
                    setCurrentPage(
                      (p) => Math.max(1, p - 1)
                    )
                  }
                  disabled={currentPage === 1}
                  className="
                    border
                    border-[var(--sid-border)]
                    rounded-[var(--radius-sm)]
                    px-4
                    py-2
                    text-xs
                    text-[var(--sid-text-secondary)]
                    disabled:opacity-40
                    disabled:cursor-not-allowed
                    hover:bg-[var(--sid-surface-page)]
                  "
                >
                  Sebelumnya
                </button>


                {Array.from(
                  { length: totalPages },
                  (_, i) => i + 1
                ).map((page) => (

                  <button
                    key={page}
                    onClick={() =>
                      setCurrentPage(page)
                    }
                    className={`
                      w-8
                      h-8
                      rounded-[var(--radius-sm)]
                      text-xs
                      font-medium
                      ${
                        page === currentPage
                          ? 'bg-[var(--sid-primary)] text-white'
                          : 'border border-[var(--sid-border)] text-[var(--sid-text-secondary)] hover:bg-[var(--sid-surface-page)]'
                      }
                    `}
                  >
                    {page}
                  </button>

                ))}


                <button
                  onClick={() =>
                    setCurrentPage(
                      (p) =>
                        Math.min(
                          totalPages,
                          p + 1
                        )
                    )
                  }
                  disabled={
                    currentPage === totalPages
                  }
                  className="
                    border
                    border-[var(--sid-border)]
                    rounded-[var(--radius-sm)]
                    px-4
                    py-2
                    text-xs
                    text-[var(--sid-text-secondary)]
                    disabled:opacity-40
                    disabled:cursor-not-allowed
                    hover:bg-[var(--sid-surface-page)]
                  "
                >
                  Selanjutnya
                </button>

              </div>

            </div>

          </div>

        </div>


        {/* ======================================
            FOOTER DESKTOP
            ====================================== */}

        <FooterDesa />

      </div>


      {/* ========================================
          MOBILE
          ======================================== */}

      <div className="
        md:hidden
        flex
        flex-col
        min-h-screen
        bg-[var(--sid-surface-page)]
      ">

        <div className="
          flex-1
          px-4
          pt-4
          pb-4
        ">

          {/* ======================================
              HEADER
              ====================================== */}

          <h1 className="
            text-xl
            font-semibold
            text-[var(--sid-text-primary)]
            mb-1
          ">
            Semua Surat
          </h1>

          <p className="
            text-sm
            text-[var(--sid-text-muted)]
            mb-4
          ">
            Kelola permohonan surat warga secara digital
          </p>


          {/* ======================================
              SEARCH
              ====================================== */}

          <div className="
            sid-search
            mb-3
          ">

            <Search
              size={16}
              className="sid-search-icon"
            />

            <input
              defaultValue={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Cari nama pemohon..."
              className="sid-search-input"
            />

          </div>


          {/* ======================================
              FILTER
              ====================================== */}

          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value)
            }
            className="
              sid-search-input
              mb-4
            "
          >

            <option value="">
              Semua Status
            </option>

            <option value="pending">
              Menunggu
            </option>

            <option value="rt_approved">
              Disetujui RT
            </option>

            <option value="rt_rejected">
              Ditolak RT
            </option>

          </select>


          {/* ======================================
              LIST SURAT
              ====================================== */}

          <div className="
            bg-[var(--sid-surface-card)]
            rounded-[var(--radius-lg)]
            shadow-[var(--shadow-card)]
            overflow-hidden
            mb-4
          ">

            {/* HEADER LIST */}

            <div className="
              grid
              grid-cols-4
              text-[10px]
              font-semibold
              text-[var(--sid-text-secondary)]
              uppercase
              px-4
              py-3
              border-b
              border-[var(--sid-border)]
            ">

              <span>
                No.Surat
              </span>

              <span className="text-center">
                Pemohon
              </span>

              <span className="text-center">
                Jenis
              </span>

              <span className="text-center">
                Tanggal
              </span>

            </div>


            {/* LOADING */}

            {loading ? (

              <p className="
                text-center
                text-sm
                text-[var(--sid-text-muted)]
                py-8
              ">
                Memuat...
              </p>

            ) : paginatedData.length === 0 ? (

              <p className="
                text-center
                text-sm
                text-[var(--sid-text-muted)]
                py-8
              ">
                Belum ada surat.
              </p>

            ) : (

              paginatedData.map((s) => (

                <button
                  key={s.id}
                  onClick={() =>
                    handleOpenDetail(s)
                  }
                  className="
                    w-full
                    grid
                    grid-cols-4
                    items-center
                    text-left
                    px-4
                    py-3
                    border-b
                    last:border-0
                    border-[var(--sid-border)]
                    hover:bg-[var(--sid-surface-page)]
                    transition-colors
                  "
                >

                  <span className="
                    text-xs
                    text-[var(--sid-text-secondary)]
                  ">
                    {s.letter_number ?? '-'}
                  </span>


                  <span className="
                    text-xs
                    font-medium
                    text-[var(--sid-text-secondary)]
                    text-center
                  ">
                    {s.applicant_name ?? '-'}
                  </span>


                  <span className="
                    text-xs
                    text-[var(--sid-text-secondary)]
                    text-center
                  ">
                    {s.letter_type?.name ?? '-'}
                  </span>


                  <span className="
                    text-xs
                    text-[var(--sid-text-secondary)]
                    text-center
                  ">
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


          {/* ======================================
              MOBILE PAGINATION
              ====================================== */}

          <div className="
            flex
            justify-center
            gap-2
            mb-4
          ">

            {Array.from(
              { length: totalPages },
              (_, i) => i + 1
            ).map((page) => (

              <button
                key={page}
                onClick={() =>
                  setCurrentPage(page)
                }
                className={`
                  w-8
                  h-8
                  rounded-full
                  text-xs
                  font-medium
                  ${
                    page === currentPage
                      ? 'bg-[var(--sid-primary)] text-white'
                      : 'bg-[var(--sid-surface-card)] border border-[var(--sid-border)] text-[var(--sid-primary)]'
                  }
                `}
              >
                {page}
              </button>

            ))}

          </div>

        </div>


        {/* ======================================
            FOOTER MOBILE
            ====================================== */}

        <div className="
          sid-mobile-footer
          pb-16
        ">
          <FooterDesa />
        </div>


        {/* ======================================
            MOBILE BOTTOM NAV
            ====================================== */}

        <MobileBottomNav
          links={ADMIN_MOBILE_LINKS(
            '/admin/dashboard-surat-rt',
            '/admin/list-rt'
          )}
        />

      </div>


      {/* ========================================
          DETAIL MODAL
          ======================================== */}

      <SuratDetailModalRT
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