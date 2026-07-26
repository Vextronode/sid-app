// ==========================================
// OperatorSuratListPage.jsx
// Halaman "Daftar Permohonan Surat" untuk Operator Desa, sesuai desain:
// breadcrumb, judul + tombol Ekspor Laporan, search+filter card,
// tabel dengan avatar inisial & badge status, pagination "Sebelumnya/1/2/Selanjutnya".
// Surat diurutkan berdasarkan tanggal submit PALING AWAL duluan (ascending).
// Aksi (titik tiga) buka OperatorSuratActionModal (TTD Basah/Digital).
// ==========================================

import { useEffect, useMemo, useState } from 'react';
import { Download, Search, MoreVertical } from 'lucide-react';
import { getSuratList } from '@/features/approval/api';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import OperatorSuratActionModal from '@/features/operator-desa/components/OperatorSuratActionModal';
import { FooterDesa } from '@/components/layout/FooterDesa';

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

  kadus_approved: {
    label: "Kadus Approved",
    className: "bg-indigo-50 text-indigo-700",
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

  kadus_rejected: {
    label: "Ditolak Kadus",
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
  const [openMenuId, setOpenMenuId] = useState(null);
  console.log(letters);
const ROLE_ENDPOINT = {
  rt: "rt",
  rw: "rw",
  kadus: "kadus",

  kasi_pelayanan: "kasi",
  kaur_tu_umum: "kasi",
  petugas_desa: "kasi",
};

const roleKey = ROLE_ENDPOINT[user?.role] ?? user?.role;

useEffect(() => {
  if (!roleKey) return;

  setLoading(true);

  getSuratList(roleKey)
    .then((res) => {
      setLetters(res.data);
    })
    .catch((err) => {
      console.error(err.response?.data ?? err);
    })
    .finally(() => setLoading(false));

}, [roleKey]);

  const filtered = useMemo(() => {
    let result = [...letters];

    if (filterJenis) result = result.filter((s) => s.letter_type?.name === filterJenis);
    if (filterStatus) result = result.filter((s) => s.status === filterStatus);
    if (search) {
      const kw = search.toLowerCase();
      result = result.filter(
        (s) => s.applicant_name?.toLowerCase().includes(kw) || s.letter_number?.toLowerCase().includes(kw)
      );
    }

    // Urutkan berdasarkan tanggal submit PALING AWAL duluan (ascending)
    result.sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));

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
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Pencarian Cepat</p>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  placeholder="Nomor surat atau nama pemohon..."
                  className="w-full border rounded-full pl-9 pr-3 py-2.5 text-sm outline-none focus:border-green-500"
                />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Jenis Surat</p>
              <select value={filterJenis} onChange={(e) => { setFilterJenis(e.target.value); setCurrentPage(1); }} className="w-full border rounded-full px-3 py-2.5 text-sm text-gray-600 outline-none focus:border-green-500" > <option value="">Semua Jenis</option> {jenisOptions.map((j) => ( <option key={j} value={j}>{j}</option> ))} </select>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Status</p>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full border rounded-full px-3 py-2.5 text-sm text-gray-600 outline-none focus:border-green-500"
            >
              <option value="">Semua Status</option>

              <option value="pending">Pending</option>

              <option value="rt_approved">RT Approved</option>
              <option value="rw_approved">RW Approved</option>
              <option value="kadus_approved">Kadus Approved</option>
              <option value="kasi_approved">Verified / Selesai</option>

              <option value="rt_rejected">Ditolak RT</option>
              <option value="rw_rejected">Ditolak RW</option>
              <option value="kadus_rejected">Ditolak Kadus</option>
              <option value="kasi_rejected">Ditolak Kasi</option>
            </select>
            </div>
          </div>
        </div>

        {/* Tabel */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-400 text-[10px] uppercase">
                <th className="py-3 px-5 font-semibold">No. Surat</th>
                <th className="py-3 px-5 font-semibold">Pemohon</th>
                <th className="py-3 px-5 font-semibold">Jenis</th>
                <th className="py-3 px-5 font-semibold">Tanggal</th>
                <th className="py-3 px-5 font-semibold">Status</th>
                <th className="py-3 px-5 font-semibold text-right">Aksi</th>
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
                    <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-4 px-5 font-semibold text-gray-800">#{s.letter_number ?? '-'}</td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
                            {(s.applicant_name ?? '?').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </div>
                          <span className="font-medium text-gray-800">{s.applicant_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-gray-600">{s.letter_type?.name ?? '-'}</td>
                      <td className="py-4 px-5 text-gray-500">{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</td>
                      <td className="py-4 px-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>
                      </td>
                      <td className="py-4 px-5 text-right relative">
                        <button onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)} className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100 text-gray-500 ml-auto">
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === s.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-5 top-12 bg-white shadow-lg rounded-lg border z-20 w-32 py-1 text-left">
                              <button
                                onClick={() => { setSelectedSurat(s); setOpenMenuId(null); }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
                              >
                                Edit
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
      <div className="[&>footer]:py-5 [&_h4]:text-[10px] [&_.text-xs]:text-[10px]">
        <FooterDesa />
      </div>

      {selectedSurat && (
        <OperatorSuratActionModal surat={selectedSurat} onClose={() => setSelectedSurat(null)} />
      )}
    </div>
  );
}