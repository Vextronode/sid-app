
// ==========================================
// RiwayatVerifikasiTable.jsx
// Tabel riwayat surat di dashboard Operator Desa.
// Styling menggunakan SID Global CSS.
// ==========================================

import { useState } from 'react';
import { MoreVertical, Printer, Eye } from 'lucide-react';
import { previewSuratPDF } from '@/features/cetak-surat/utils/generateSuratPDF';

const STATUS_LABEL = {
  pending: {
    label: 'PENDING',
    className: 'sid-status-pending',
  },

  rt_approved: {
    label: 'PROSES',
    className: 'sid-status-process',
  },

  rt_rejected: {
    label: 'DITOLAK',
    className: 'sid-status-rejected',
  },

  rw_approved: {
    label: 'VERIFIED',
    className: 'sid-status-approved',
  },

  rw_rejected: {
    label: 'DITOLAK',
    className: 'sid-status-rejected',
  },
};

export default function RiwayatVerifikasiTable({ data }) {
  const [openMenuId, setOpenMenuId] = useState(null);

  return (
    <div className="sid-dashboard-card sid-history-card">

      {/* HEADER */}

      <div className="sid-card-header">
        <h3>Riwayat Verifikasi</h3>

        <button className="sid-card-link">
          Lihat Semua →
        </button>
      </div>

      {/* TABLE */}

      <div className="sid-table-wrapper">
        <table className="sid-history-table">

          <thead>
            <tr>
              <th>Nama Resident</th>
              <th>Tipe Surat</th>
              <th>Waktu Pengajuan</th>
              <th>Status</th>
              <th className="sid-table-action-header">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody>

            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="sid-table-empty"
                >
                  Belum ada data.
                </td>
              </tr>
            ) : (

              data.map((surat) => {

                // Surat cuma bisa di-print kalau sudah lolos RT & RW
                const bisaCetak =
                  surat.status === 'rw_approved';

                const badge =
                  STATUS_LABEL[surat.status] ?? {
                    label: surat.status,
                    className: 'sid-status-default',
                  };

                return (
                  <tr key={surat.id}>

                    {/* NAMA */}

                    <td>
                      <div className="sid-resident-cell">

                        <div className="sid-resident-avatar">
                          {(surat.applicant_name ?? '?')
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </div>

                        <span className="sid-resident-name">
                          {surat.applicant_name}
                        </span>

                      </div>
                    </td>

                    {/* TIPE SURAT */}

                    <td className="sid-letter-type">
                      {surat.letter_type?.name ?? '-'}
                    </td>

                    {/* WAKTU */}

                    <td className="sid-submitted-date">
                      {surat.submitted_at
                        ? new Date(
                            surat.submitted_at
                          ).toLocaleString('id-ID')
                        : '-'}
                    </td>

                    {/* STATUS */}

                    <td>
                      <span
                        className={`sid-status-badge ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>

                    {/* AKSI */}

                    <td className="sid-table-action">

                      <button
                        onClick={() =>
                          setOpenMenuId(
                            openMenuId === surat.id
                              ? null
                              : surat.id
                          )
                        }
                        className="sid-action-menu-button"
                        aria-label="Menu aksi"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openMenuId === surat.id && (
                        <>
                          <div
                            className="sid-action-backdrop"
                            onClick={() =>
                              setOpenMenuId(null)
                            }
                          />

                          <div className="sid-action-menu">

                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                /* TODO: buka modal detail */
                              }}
                              className="sid-action-menu-item"
                            >
                              <Eye size={14} />
                              Lihat Detail
                            </button>

                            <button
                              disabled={!bisaCetak}
                              onClick={() => {
                                if (bisaCetak) {
                                  previewSuratPDF(surat);
                                  setOpenMenuId(null);
                                }
                              }}
                              className={`sid-action-menu-item ${
                                bisaCetak
                                  ? 'sid-action-print-active'
                                  : 'sid-action-print-disabled'
                              }`}
                              title={
                                !bisaCetak
                                  ? 'Surat belum disetujui RT & RW'
                                  : ''
                              }
                            >
                              <Printer size={14} />
                              Print Surat
                            </button>

                          </div>
                        </>
                      )}

                    </td>

                  </tr>
                );
              })
            )}

          </tbody>

        </table>
      </div>

    </div>
  );
}

