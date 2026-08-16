/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
// ==========================================
// RTListPage.jsx
// Desktop: gaya baru (search+filter card, tabel dengan avatar & badge,
// pagination "Sebelumnya/1/2/Selanjutnya"). Mobile: tetap versi sebelumnya.
// Modal detail (approve/reject) tetap SuratDetailModalRT.
// ==========================================

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useSuratList } from '@/features/approval-rt/hooks/useSuratList';
import { useApprovalAction } from '@/features/approval-rt/hooks/useApprovalAction';
import SuratDetailModalRT from '@/features/approval-rt/components/SuratDetailModalRT';
import StatusBadgeRT from '@/features/approval-rt/components/StatusBadgeRT';
import { BASE_PATH } from '@/features/approval-rt/constants/roleConfig';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FooterDesa } from '@/components/layout/FooterDesa';
import { ADMIN_MOBILE_LINKS } from '@/lib/constants/navigation';

const ITEMS_PER_PAGE = 5;

export default function RTListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') ?? '';
  const [currentPage, setCurrentPage] = useState(1);

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

  useEffect(() => setCurrentPage(1), [search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(data.length / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return data.slice(start, start + ITEMS_PER_PAGE);
  }, [data, currentPage]);

  const [selectedId, setSelectedId] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

const handleApprove = async () => {
  try {
    await approve(selectedId);

    // Ambil data terbaru setelah approve
    await refresh();

    // Tutup modal
    setSelectedId(null);
    setIsReadOnly(false);
  } catch (error) {
    console.error("Gagal approve surat:", error);
  }
};

const handleReject = async (alasan) => {
  try {
    await reject(selectedId, alasan);

    // Ambil data terbaru setelah reject
    await refresh();

    // Tutup modal
    setSelectedId(null);
    setIsReadOnly(false);
  } catch (error) {
    console.error("Gagal reject surat:", error);
  }
};

  return (
    <>
      {/* ===== DESKTOP ===== */}
      <div className="hidden md:block p-6">
        <p className="text-xs text-gray-400 mb-1">Admin / <span className="text-gray-600">Daftar Permohonan Surat</span></p>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Daftar Permohonan Surat</h1>

        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Pencarian Cepat</p>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  defaultValue={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nomor surat atau nama pemohon..."
                  className="w-full border rounded-full pl-9 pr-3 py-2.5 text-sm text-gray-400 outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Status</p>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border rounded-full px-3 py-2.5 text-sm text-gray-400 outline-none focus:border-blue-500"
              >
                <option value="">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="rt_approved">Disetujui RT</option>
                <option value="rt_rejected">Ditolak RT</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden text-gray-400">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-400 text-[10px] uppercase">
                <th className="py-3 px-5 font-semibold text-gray-500">No. Surat</th>
                <th className="py-3 px-5 font-semibold text-center text-gray-500">Pemohon</th>
                <th className="py-3 px-5 font-semibold text-center text-gray-500">Jenis</th>
                <th className="py-3 px-5 font-semibold text-center text-gray-500">Tanggal</th>
                <th className="py-3 px-5 font-semibold text-center text-gray-500">Status</th>
                <th className="py-3 px-5 font-semibold text-center text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center text-gray-400 py-10">Memuat data surat...</td></tr>
              ) : paginatedData.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-400 py-10">Belum ada surat.</td></tr>
              ) : (
                paginatedData.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50 text-gray-400">
                    <td className="py-4 px-5 font-semibold text-gray-400">#{s.letter_number ?? '-'}</td>
                    <td className="py-4 px-5 text-center text-gray-400">{s.applicant_name}
         
                    </td>
                    <td className="py-4 px-5 text-gray-400 text-center">{s.letter_type?.name ?? '-'}</td>
                    <td className="py-4 px-5 text-gray-400 text-center">{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</td>
                    <td className="py-4 px-5 text-center"><StatusBadgeRT status={s.status} /></td>
                    <td className="py-4 px-5 text-center">
                      <button
                        onClick={() => { setSelectedId(s.id); setIsReadOnly(s.status !== 'pending'); }}
                        className="border rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
                      >
                        {s.status === 'pending' ? 'Proses' : 'Lihat'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-5 py-4 border-t">
            <p className="text-xs text-gray-500">
              Menampilkan {paginatedData.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}-{(currentPage - 1) * ITEMS_PER_PAGE + paginatedData.length} dari {data.length} data
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="border rounded-lg px-4 py-2 text-xs text-gray-600 disabled:opacity-40">
                Sebelumnya
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-xs font-medium ${page === currentPage ? 'bg-[#185FA5] text-white' : 'border text-gray-600'}`}>
                  {page}
                </button>
              ))}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="border rounded-lg px-4 py-2 text-xs text-gray-600 disabled:opacity-40">
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MOBILE ===== */}
      <div className="md:hidden flex flex-col min-h-screen bg-gray-50">
        <div className="flex-1 px-4 pt-4">

          <h1 className="text-xl font-bold text-gray-800 mb-1">Semua Surat</h1>
          <p className="text-sm text-gray-500 mb-4">Kelola permohonan surat warga secara digital</p>

          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              defaultValue={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama pemohon..."
              className="w-full border rounded-full pl-9 pr-3 py-2.5 text-sm text-gray-400 outline-none focus:border-blue-500 bg-white"
            />
          </div>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full border rounded-full px-3 py-2 text-xs text-gray-400 bg-white mb-4">
            <option value="">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="rt_approved">Disetujui RT</option>
            <option value="rt_rejected">Ditolak RT</option>
          </select>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
            <div className="grid grid-cols-4 text-[10px] font-semibold text-gray-400 uppercase px-4 py-3 border-b ">
              <span className=" text-gray-500">No.Surat</span><span className="text-center text-gray-500">Pemohon</span><span className="text-center text-gray-500">Jenis</span><span className="text-center text-gray-500">Tanggal</span>
            </div>
            {loading ? (
              <p className="text-center text-gray-400 text-sm py-8">Memuat...</p>
            ) : paginatedData.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Belum ada surat.</p>
            ) : (
              paginatedData.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedId(s.id); setIsReadOnly(s.status !== 'pending'); }}
                  className="w-full grid grid-cols-4 items-center text-left px-4 py-3 border-b last:border-0 text-xs text-gray-400"
                >
                  <span className="text-gray-400">{s.letter_number ?? '-'}</span>
                  <span className="font-semibold text-gray-400 text-center">{s.applicant_name}</span>
                  <span className="text-gray-400 text-center">{s.letter_type?.name ?? '-'}</span>
                  <span className="text-gray-400 text-center">{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('id-ID') : '-'}</span>
                </button>
              ))
            )}
          </div>

          <div className="flex justify-center gap-2 mb-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-full text-xs font-medium ${page === currentPage ? 'bg-[#185FA5] text-white' : 'bg-white border text-blue-600'}`}>
                {page}
              </button>
            ))}
          </div>
        </div>

        <div className="pb-16">
          <FooterDesa />
        </div>
        <MobileBottomNav links={ADMIN_MOBILE_LINKS('/admin/dashboard-surat-rt', '/admin/list-rt')} />
      </div>

      <SuratDetailModalRT
        suratId={selectedId}
        onClose={() => { setSelectedId(null); setIsReadOnly(false); }}
        onApprove={handleApprove}
        onReject={handleReject}
        readOnly={isReadOnly}
      />
    </>
  );
}