// ==========================================
// OperatorSuratListPage.jsx
// Halaman "Daftar Permohonan Surat" untuk Operator Desa, sesuai desain:
// breadcrumb, judul + tombol Ekspor Laporan, search+filter card,
// tabel dengan avatar inisial & badge status, pagination "Sebelumnya/1/2/Selanjutnya".
// Surat diurutkan selesai sampai di tolak
// Aksi (titik tiga) buka OperatorSuratActionModal (TTD Basah/Digital).
// ==========================================
import OperatorSuratPreviewModal from "@/features/operator-desa/components/OperatorSuratPreviewModal";
import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Search,
  Pencil,
  Eye,
  Trash2,
} from "lucide-react";
import { getSuratList } from '@/features/approval/api';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import OperatorSuratActionModal from '@/features/operator-desa/components/OperatorSuratActionModal';
import { FooterDesa } from '@/components/layout/FooterDesa';
import { FooterOperator } from '../../components/layout/FooterOperator';

const STATUS_LABEL = {
  pending: {
    label: "Pending",
    className: "bg-gray-100 text-gray-500",
  },

  rt_approved: {
    label: "RT Approved",
    className: "bg-blue-50 text-blue-600",
  },

  rw_approved: {
    label: "RW Approved",
    className: "bg-cyan-50 text-cyan-700",
  },



  kasi_approved: {
    label: "Verified",
    className: "bg-green-50 text-green-700",
  },

  rt_rejected: {
    label: "Ditolak RT",
    className: "bg-red-50 text-red-600",
  },

  rw_rejected: {
    label: "Ditolak RW",
    className: "bg-red-50 text-red-600",
  },



  kasi_rejected: {
    label: "Ditolak Kasi",
    className: "bg-red-50 text-red-600",
  },
};

const ITEMS_PER_PAGE = 3;

export default function OperatorSuratListPage() {
  const { user } = useAuth();
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSurat, setSelectedSurat] = useState(null);
  const [previewSurat, setPreviewSurat] = useState(null);

const ROLE_ENDPOINT = {
  rt: "rt",
  rw: "rw",

  kasi_pelayanan: "kasi",
  kaur_tu_umum: "kasi",
  petugas_desa: "kasi",
};

const roleKey = ROLE_ENDPOINT[user?.role] ?? user?.role;

const loadLetters = async () => {
  if (!roleKey) return;

  setLoading(true);

  try {
    const res = await getSuratList(roleKey);
    setLetters(res.data);
  } catch (err) {
    console.error(err.response?.data ?? err);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  loadLetters();
}, [roleKey]);

  const filtered = useMemo(() => {
    let result = [...letters];

    if (filterJenis) result = result.filter((s) => s.letter_type?.name === filterJenis);
    if (filterStatus) {
  switch (filterStatus) {
    case "verification":
      result = result.filter((s) =>
        [ "rt_approved", "rw_approved"].includes(s.status)
      );
      break;

    case "completed":
      result = result.filter((s) => s.status === "kasi_approved");
      break;

    case "rejected":
      result = result.filter((s) =>
        ["rt_rejected", "rw_rejected"].includes(s.status)
      );
      break;

    default:
      break;
  }
}
    if (search) {
      const kw = search.toLowerCase();
      result = result.filter(
        (s) => s.applicant_name?.toLowerCase().includes(kw) || s.letter_number?.toLowerCase().includes(kw)
      );
    }

    // Urutkan berdasarkan selesai sampai di tolak
const STATUS_ORDER = {
  kasi_approved: 1,
  rw_approved: 2,
  rt_approved: 3,
  pending: 4,
  rw_rejected: 5,
  rt_rejected: 6,
  kasi_rejected: 7,
};

result.sort((a, b) => {
  // Ambil tanggal tanpa jam
  const dateA = new Date(a.submitted_at ?? a.created_at);
  const dateB = new Date(b.submitted_at ?? b.created_at);

  const onlyDateA = new Date(
    dateA.getFullYear(),
    dateA.getMonth(),
    dateA.getDate()
  );

  const onlyDateB = new Date(
    dateB.getFullYear(),
    dateB.getMonth(),
    dateB.getDate()
  );

  // 1. Tanggal terbaru dulu
  if (onlyDateA.getTime() !== onlyDateB.getTime()) {
    return onlyDateB - onlyDateA;
  }

  // 2. Kalau tanggal sama → urut status
  const orderA = STATUS_ORDER[a.status] ?? 999;
  const orderB = STATUS_ORDER[b.status] ?? 999;

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  // 3. Kalau status sama → jam terbaru dulu
  return dateB - dateA;
});

    return result;
  }, [letters, filterJenis, filterStatus, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const jenisOptions = useMemo(() => {
    const set = new Set(letters.map((s) => s.letter_type?.name).filter(Boolean));
    return Array.from(set);
  }, [letters]);

  return (
    <div>
      <div className="p-6">
        {/* Breadcrumb */}
        <p className="text-xs text-gray-400 mb-1">Admin / <span className="text-gray-600">Daftar Permohonan Surat</span></p>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Daftar Permohonan Surat</h1>
          <button className="flex items-center gap-2 border rounded-lg px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 bg-white">
            <Download size={16} /> Ekspor Laporan
          </button>
        </div>

        {/* Search & filter card */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Pencarian Cepat</p>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  placeholder="Nomor surat atau nama pemohon..."
                  className="w-full border text-gray-400 rounded-full pl-9 pr-3 py-2.5 text-sm outline-none focus:border-green-500"
                />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Jenis Surat</p>
              <select value={filterJenis} onChange={(e) => { setFilterJenis(e.target.value); setCurrentPage(1); }} className="w-full border rounded-full px-3 py-2.5 text-sm text-gray-400 outline-none focus:border-green-500" > <option value="">Semua Jenis</option> {jenisOptions.map((j) => ( <option key={j} value={j}>{j}</option> ))} </select>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Status</p>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full border rounded-full px-3 py-2.5 text-sm text-gray-400 outline-none focus:border-green-500"
              >
                <option value="">Semua Status</option>
                <option value="verification">Verifikasi</option>
                <option value="completed">Selesai</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabel */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden text-gray-400">
          <table className="w-full text-sm text-gray-400">
            <thead>
              <tr className="border-b text-left text-gray-400 text-[10px] uppercase">
                <th className="py-3 px-5 font-semibold text- text-gray-500">No. Surat</th>
                <th className="py-3 px-5 font-semibold  text-center text-gray-500">Pemohon</th>
                <th className="py-3 px-5 font-semibold text-center text-gray-500">Jenis</th>
                <th className="py-3 px-5 font-semibold text-center text-gray-500">Tanggal</th>
                <th className="py-3 px-5 font-semibold text-center text-gray-500">
                  RT / RW
                </th>
                <th className="py-3 px-5 font-semibold  text-center text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center text-gray-400 py-10">Memuat data surat...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-400 py-10">Belum ada surat.</td></tr>
              ) : (
                paginated.map((s) => {
                  const badge = STATUS_LABEL[s.status] ?? { label: s.status, className: 'bg-gray-50 text-gray-500' };
                  return (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50 text-gray-400">
                      <td className="py-4 px-5 font-semibold text-gray-400 ">#{s.letter_number ?? '-'}</td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-400  text-center ">{s.applicant_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-gray-400  text-center">{s.letter_type?.name ?? '-'}</td>
                      <td className="py-4 px-5 text-gray-400  text-center">{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</td>
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-center gap-6">

                          {/* RT */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-400">
                              RT
                            </span>

                            {[
                              "rt_approved",
                              "rw_approved",
                              "kasi_approved",
                              "rw_rejected",
                            ].includes(s.status) ? (
                              <div className="w-5 h-5 rounded border-2 border-green-600 bg-green-600 flex items-center justify-center text-white text-xs">
                                ✓
                              </div>
                            ) : s.status === "rt_rejected" ? (
                              <div className="w-5 h-5 rounded border-2 border-red-500 bg-red-500 flex items-center justify-center text-white text-xs">
                                ✕
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded border-2 border-gray-300 bg-white" />
                            )}
                          </div>

                          {/* RW */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-400">
                              RW
                            </span>

                            {[
                              "rw_approved",
                              "kasi_approved",
                            ].includes(s.status) ? (
                              <div className="w-5 h-5 rounded border-2 border-green-600 bg-green-600 flex items-center justify-center text-white text-xs">
                                ✓
                              </div>
                            ) : s.status === "rw_rejected" ? (
                              <div className="w-5 h-5 rounded border-2 border-red-500 bg-red-500 flex items-center justify-center text-white text-xs">
                                ✕
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded border-2 border-gray-300 bg-white" />
                            )}
                          </div>

                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-end gap-2">

                          {/* Detail */}
                          <button
                            onClick={() => setPreviewSurat(s)}
                            className="w-9 h-9 rounded-lg border  
                                      text-gray-800 hover:bg-blue-100 transition"
                            title="Detail Surat"
                          >
                            <Eye size={17} className="mx-auto" />
                          </button>

                          {/* Edit */}
                          {s.status !== "kasi_approved" && (
                            <button
                              onClick={() => setSelectedSurat(s)}
                              className="w-9 h-9 rounded-lg border border-amber-200 bg-amber-50
                                        text-amber-600 hover:bg-amber-100 transition"
                              title="Edit Surat"
                            >
                              <Pencil size={17} className="mx-auto" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              window.alert(
                                "Fitur hapus surat belum tersedia.\n\nSaat ini fitur tersebut masih dalam proses pengembangan."
                              );
                            }}
                            className="w-9 h-9 rounded-lg border border-red-200 bg-red-50
                                      text-red-600 hover:bg-red-100 transition"
                            title="Hapus Surat"
                          >
                            <Trash2 size={17} className="mx-auto" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t">
            <p className="text-xs text-gray-500">
              Menampilkan {paginated.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}-{(currentPage - 1) * ITEMS_PER_PAGE + paginated.length} dari {filtered.length} data
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border rounded-lg px-4 py-2 text-xs text-gray-600 disabled:opacity-40"
              >
                Sebelumnya
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium ${
                    page === currentPage ? 'bg-green-600 text-white' : 'border text-gray-600'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border rounded-lg px-4 py-2 text-xs text-gray-600 disabled:opacity-40"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer versi ringkas sesuai desain (lebih pendek dari FooterDesa default) */}
        <FooterOperator />


      {previewSurat && (
          <OperatorSuratPreviewModal
              surat={previewSurat}
              onClose={() => setPreviewSurat(null)}
          />
      )}

      {selectedSurat && (
        <OperatorSuratActionModal
          surat={selectedSurat}
          onClose={() => {
            setSelectedSurat(null);
            loadLetters();
          }}
        />
      )}
    </div>
  );
}