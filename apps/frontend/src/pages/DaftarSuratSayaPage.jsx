// ==========================================
// DaftarSuratSayaPage.jsx
// Tabel daftar surat, difilter sesuai query param status. Dibuka dari
// tombol Total Pengajuan / Disetujui / Ditolak di halaman Surat.
// ==========================================

import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Eye } from 'lucide-react';
import { WargaLayout } from '@/components/layout/WargaLayout';
import { useLetters } from '@/features/surat/hooks/useLetters';
import { DetailSuratModal } from '@/features/surat/components/DetailSuratModal';

const STATUS_LABEL = {
  pending: {
    label: "MENUNGGU RT",
    className: "bg-gray-100 text-gray-600",
  },

  rt_approved: {
    label: "DIPROSES RW",
    className: "bg-blue-100 text-blue-700",
  },

  rt_rejected: {
    label: "DITOLAK RT",
    className: "bg-red-100 text-red-600",
  },

  rw_approved: {
    label: "DIPROSES KANTOR DESA",
    className: "bg-amber-100 text-amber-700",
  },

  rw_rejected: {
    label: "DITOLAK RW",
    className: "bg-red-100 text-red-600",
  },

  kasi_approved: {
    label: "DISETUJUI",
    className: "bg-green-100 text-green-700",
  },

  kaur_tu_umum_approved: {
    label: "DISETUJUI",
    className: "bg-green-100 text-green-700",
  },

  petugas_desa_approved: {
    label: "DISETUJUI",
    className: "bg-green-100 text-green-700",
  },

  waiting_revision_warga: {
    label: "MENUNGGU REVISI",
    className: "bg-amber-100 text-amber-700",
  },

  rejected_revision: {
    label: "DITOLAK (REVISI)",
    className: "bg-red-100 text-red-600",
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
    "kasi_approved",
    "kaur_tu_umum_approved",
    "petugas_desa_approved",
  ];

  const filtered = letters.filter((item) => {
    if (!filterStatus) return true;

    if (filterStatus === "ditolak") {
      return item.status?.endsWith("_rejected") || item.status === "waiting_revision_warga" || item.status === "rejected_revision";
    }

    if (filterStatus === "approved") {
      return approvedStatuses.includes(item.status);
    }

    return item.status === filterStatus;
  });

  return (
    <WargaLayout>
      <div className="px-4 py-5 max-w-3xl mx-auto">
        <button onClick={() => navigate('/jenis-surat')} className="flex items-center gap-1 text-sm text-orange-600 mb-4 hover:underline">
          <ArrowLeft size={16} /> Kembali
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-1">{PAGE_TITLE[filterStatus] ?? 'Daftar Permohonan'}</h1>
        <p className="text-sm text-gray-500 mb-6">Daftar surat yang pernah Anda ajukan</p>

<div className="bg-white rounded-2xl shadow-sm overflow-hidden">
  {loading ? (
    <p className="text-center text-gray-400 text-sm py-8">
      Memuat data surat...
    </p>
  ) : filtered.length === 0 ? (
    <p className="text-center text-gray-400 text-sm py-8">
      Belum ada surat pada kategori ini.
    </p>
  ) : (
    <table className="w-full table-fixed text-sm text-gray-400">
      <thead>
        <tr className="border-b text-gray-400 text-[9px] sm:text-[10px] uppercase">
          
          {/* JENIS */}
          <th className="py-3 px-2 sm:px-4 font-semibold text-gray-500 text-left w-[32%]">
            Jenis Surat
          </th>

          {/* TANGGAL */}
          <th className="py-3 px-1 sm:px-4 font-semibold text-gray-500 text-center w-[20%]">
            Tanggal
          </th>

          {/* STATUS */}
          <th className="py-3 px-1 sm:px-4 font-semibold text-gray-500 text-center w-[22%]">
            Status
          </th>

          {/* AKSI */}
          <th className="py-3 px-1 sm:px-4 font-semibold text-gray-500 text-center w-[26%]">
            Aksi
          </th>
        </tr>
      </thead>

      <tbody>
        {filtered.map((item) => {
          const badge =
            STATUS_LABEL[item.status] ?? {
              label: item.status,
              className: "bg-gray-100 text-gray-500",
            };

          return (
            <tr
              key={item.id}
              className="border-b last:border-0 hover:bg-gray-50/50 transition"
            >

              {/* ==========================
                  JENIS SURAT
              ========================== */}
              <td className="py-3 px-2 sm:px-4 align-top">
                <div className="min-w-0">
                  <p className="
                    font-medium
                    text-gray-500
                    text-[10px]
                    sm:text-sm
                    leading-4
                    break-words
                  ">
                    {item.letter_type?.name ?? "-"}
                  </p>

                  <p className="
                    text-[8px]
                    sm:text-[10px]
                    text-gray-400
                    mt-0.5
                    break-words
                  ">
                    #{item.letter_number ?? `SKD-${item.id}`}
                  </p>
                </div>
              </td>

              {/* ==========================
                  TANGGAL
              ========================== */}
              <td className="py-3 px-1 sm:px-4 text-center">
                <span className="text-[9px] sm:text-sm text-gray-400 whitespace-nowrap">
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString(
                        "id-ID"
                      )
                    : "-"}
                </span>
              </td>

              {/* ==========================
                  STATUS
              ========================== */}
              <td className="py-3 px-1 sm:px-4 text-center">
                <span
                  className={`
                    inline-flex
                    items-center
                    justify-center
                    whitespace-nowrap
                    px-1.5
                    sm:px-2
                    py-1
                    rounded-full
                    text-[8px]
                    sm:text-[10px]
                    font-semibold
                    ${badge.className}
                  `}
                >
                  {badge.label}
                </span>
              </td>

              {/* ==========================
                  AKSI
              ========================== */}
              <td className="py-3 px-1 sm:px-4">
                <div className="flex items-center justify-center gap-1 sm:gap-2">

                  {/* DETAIL */}
                  <button
                    onClick={() =>
                      setSelectedSurat({
                        ...item,
                        noSurat: item.letter_number,
                        pemohon: item.applicant_name,
                        jenis: item.letter_type?.name,
                        tanggal: item.created_at
                          ? new Date(
                              item.created_at
                            ).toLocaleDateString("id-ID")
                          : "-",
                      })
                    }
                    className="
                      inline-flex
                      items-center
                      gap-1
                      px-2
                      sm:px-3
                      py-1.5
                      rounded-full
                      border
                      border-gray-300
                      text-[9px]
                      sm:text-xs
                      text-gray-800
                      hover:bg-gray-100
                      whitespace-nowrap
                    "
                  >
                    <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    Detail
                  </button>

                  {/* REVISI */}
                  {item.status === "waiting_revision_warga" && (
                    <button
                      onClick={() =>
                        navigate(`/revisi-surat/${item.id}`)
                      }
                      className="
                        inline-flex
                        items-center
                        gap-1
                        px-2
                        sm:px-3
                        py-1.5
                        rounded-full
                        border
                        border-amber-300
                        text-amber-700
                        bg-amber-50
                        hover:bg-amber-100
                        text-[9px]
                        sm:text-xs
                        font-medium
                        whitespace-nowrap
                      "
                    >
                      <Edit className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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
  )}
</div>
      </div>

      {selectedSurat && (
        <DetailSuratModal
          data={selectedSurat}
          onClose={() => setSelectedSurat(null)}
        />
      )}
    </WargaLayout>
  );
}