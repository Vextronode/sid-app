// ==========================================
// DaftarSuratSayaPage.jsx
// Tabel daftar surat, difilter sesuai query param status.
// Styling menggunakan SID Global Theme.
// ==========================================

import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Eye } from 'lucide-react';
import { WargaLayout } from '@/components/layout/WargaLayout';
import { useLetters } from '@/features/surat/hooks/useLetters';
import { DetailSuratModal } from '@/features/surat/components/DetailSuratModal';

const STATUS_LABEL = {
  pending: {
    label: 'MENUNGGU RT',
    className: 'status-pending',
  },

  rt_approved: {
    label: 'DIPROSES RW',
    className: 'status-progress',
  },

  rt_rejected: {
    label: 'DITOLAK RT',
    className: 'status-rejected',
  },

  rw_approved: {
    label: 'DIPROSES',
    className: 'status-progress',
  },

  rw_rejected: {
    label: 'DITOLAK RW',
    className: 'status-rejected',
  },

  kasi_approved: {
    label: 'DISETUJUI',
    className: 'status-done',
  },

  kaur_tu_umum_approved: {
    label: 'DISETUJUI',
    className: 'status-done',
  },

  petugas_desa_approved: {
    label: 'DISETUJUI',
    className: 'status-done',
  },

  waiting_revision_warga: {
    label: 'REVISI',
    className: 'status-pending',
  },

  rejected_revision: {
    label: 'DITOLAK (REVISI)',
    className: 'status-rejected',
  },
};

const PAGE_TITLE = {
  '': 'Semua Pengajuan',
  approved: 'Permohonan Disetujui',
  ditolak: 'Permohonan Ditolak',
};

export default function DaftarSuratSayaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const filterStatus = searchParams.get('status') ?? '';

  const { letters, loading } = useLetters();

  const [selectedSurat, setSelectedSurat] = useState(null);

  const approvedStatuses = [
    'kasi_approved',
    'kaur_tu_umum_approved',
    'petugas_desa_approved',
  ];

  const filtered = letters.filter((item) => {
    if (!filterStatus) return true;

    if (filterStatus === 'ditolak') {
      return (
        item.status?.endsWith('_rejected') ||
        item.status === 'waiting_revision_warga' ||
        item.status === 'rejected_revision'
      );
    }

    if (filterStatus === 'approved') {
      return approvedStatuses.includes(item.status);
    }

    return item.status === filterStatus;
  });

  return (
    <WargaLayout>
      <div className="sid-page sid-surat-saya-page">

        {/* ==========================================
            KEMBALI
            ========================================== */}

        <button
          type="button"
          onClick={() => navigate('/jenis-surat')}
          className="sid-surat-saya-back"
        >
          <ArrowLeft size={16} />
          Kembali
        </button>


        {/* ==========================================
            HEADER
            ========================================== */}

        <h1 className="sid-page-title">
          {PAGE_TITLE[filterStatus] ?? 'Daftar Permohonan'}
        </h1>

        <p className="sid-page-description">
          Daftar surat yang pernah Anda ajukan
        </p>


        {/* ==========================================
            CARD TABEL
            ========================================== */}

        <div className="sid-card sid-surat-saya-table-card">

          {loading ? (

            <p className="sid-surat-saya-message">
              Memuat data surat...
            </p>

          ) : filtered.length === 0 ? (

            <p className="sid-surat-saya-message">
              Belum ada surat pada kategori ini.
            </p>

          ) : (

            <div className="sid-surat-saya-table-wrapper">

              <table className="sid-surat-saya-table">

                {/* ==================================
                    TABLE HEADER
                    ================================== */}

                <thead>
                  <tr>

                    <th className="sid-surat-saya-col-type">
                      Jenis Surat
                    </th>

                    <th className="sid-surat-saya-col-date">
                      Tanggal
                    </th>

                    <th className="sid-surat-saya-col-status">
                      Status
                    </th>

                    <th className="sid-surat-saya-col-action">
                      Aksi
                    </th>

                  </tr>
                </thead>


                {/* ==================================
                    TABLE BODY
                    ================================== */}

                <tbody>

                  {filtered.map((item) => {

                    const badge =
                      STATUS_LABEL[item.status] ?? {
                        label: item.status,
                        className: 'status-default',
                      };

                    return (
                      <tr key={item.id}>

                        {/* JENIS SURAT */}

                        <td className="sid-surat-saya-type-cell">

                          <div className="sid-surat-saya-type-info">

                            <p className="sid-surat-saya-type-name">
                              {item.letter_type?.name ?? '-'}
                            </p>

                            <p className="sid-surat-saya-letter-number">
                              #{item.letter_number ?? `SKD-${item.id}`}
                            </p>

                          </div>

                        </td>


                        {/* TANGGAL */}

                        <td className="sid-surat-saya-date-cell">

                          <span>
                            {item.created_at
                              ? new Date(
                                  item.created_at
                                ).toLocaleDateString('id-ID')
                              : '-'}
                          </span>

                        </td>


                        {/* STATUS */}

                        <td className="sid-surat-saya-status-cell">

                          <span
                            className={`sid-surat-saya-status ${badge.className}`}
                          >
                            {badge.label}
                          </span>

                        </td>


                        {/* AKSI */}

                        <td className="sid-surat-saya-action-cell">

                          <div className="sid-surat-saya-actions">

                            {/* DETAIL */}

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedSurat({
                                  ...item,
                                  noSurat: item.letter_number,
                                  pemohon: item.applicant_name,
                                  jenis: item.letter_type?.name,
                                  tanggal: item.created_at
                                    ? new Date(
                                        item.created_at
                                      ).toLocaleDateString('id-ID')
                                    : '-',
                                })
                              }
                              className="sid-surat-saya-detail-button"
                            >
                              <Eye />
                              Detail
                            </button>


                            {/* REVISI */}

                            {item.status === 'waiting_revision_warga' && (
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/revisi-surat/${item.id}`)
                                }
                                className="sid-surat-saya-revision-button"
                              >
                                <Edit />
                                Revisi
                              </button>
                            )}

                          </div>

                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>


      {/* ==========================================
          DETAIL MODAL
          ========================================== */}

      {selectedSurat && (
        <DetailSuratModal
          data={selectedSurat}
          onClose={() => setSelectedSurat(null)}
        />
      )}

    </WargaLayout>
  );
}