/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
// ==========================================
// KadesListPage.jsx
// Desain identik RTListPage. Kolom Aksi cuma tombol Lihat (tidak ada
// Edit/Hapus), dan modal yang terbuka selalu read-only.
// ==========================================

import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Eye } from 'lucide-react';
import { useSuratList } from '@/features/approval-kades/hooks/useSuratListKades';
import StatusBadgeRT from '@/features/approval-rt/components/StatusBadgeRT';
import SuratDetailModalKades from '@/features/approval-kades/components/SuratDetailModalKades';
import { BASE_PATH } from '@/features/approval-kades/constants/roleConfigkades';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FooterDesa } from '@/components/layout/FooterDesa';
import { ADMIN_MOBILE_LINKS } from '@/lib/constants/navigation';

const ITEMS_PER_PAGE = 4;

export default function KadesListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') ?? '';
  const [currentPage, setCurrentPage] = useState(1);

  const { data, loading, search, setSearch, filterJenis, setFilterJenis, filterStatus, setFilterStatus } = useSuratList({ initialStatus });

  useEffect(() => setCurrentPage(1), [search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(data.length / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return data.slice(start, start + ITEMS_PER_PAGE);
  }, [data, currentPage]);

  const [selectedId, setSelectedId] = useState(null);

  return (
    <>
      {/* ===== DESKTOP ===== */}
      <div className="hidden md:block max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-gray-800">Semua permohonan surat (monitoring)</h2>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="flex gap-3 mb-4">
          <input
            defaultValue={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama pemohon..."
            className="flex-1 border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
          />
          <button type="submit" className="bg-green-600 text-white px-4 rounded-md flex items-center justify-center"><Search size={16} /></button>
          <select onChange={(e) => setFilterJenis(e.target.value)} className="border border-green-500 text-green-600 rounded-md px-3 text-sm">
            <option value="">Semua Jenis</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-green-500 text-green-600 rounded-md px-3 text-sm">
            <option value="">Semua Status</option>
            <option value="pending">pending</option>
            <option value="rt_approved">rt_approved</option>
            <option value="rt_rejected">rt_rejected</option>
            <option value="rw_approved">rw_approved</option>
            <option value="rw_rejected">rw_rejected</option>
          </select>
        </form>

        <table className="w-full text-sm bg-white rounded-lg overflow-hidden">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-3 px-4 font-medium">No.Surat</th>
              <th className="py-3 px-4 font-medium">Pemohon</th>
              <th className="py-3 px-4 font-medium">Jenis</th>
              <th className="py-3 px-4 font-medium">Tanggal</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center text-gray-400 py-8">Memuat data surat...</td></tr>
            ) : paginatedData.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-gray-400 py-8">Belum ada surat.</td></tr>
            ) : (
              paginatedData.map((s) => (
                <tr key={s.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{s.letter_number ?? '-'}</td>
                  <td className="py-3 px-4">{s.applicant_name}</td>
                  <td className="py-3 px-4">{s.letter_type?.name ?? '-'}</td>
                  <td className="py-3 px-4">{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('id-ID') : '-'}</td>
                  <td className="py-3 px-4"><StatusBadgeRT status={s.status} /></td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => setSelectedId(s.id)}
                      className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100 text-gray-600"
                      title="Lihat Detail"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between mt-4">
          <button onClick={() => navigate(BASE_PATH)} className="border border-green-500 text-green-600 rounded-full px-4 py-1.5 text-sm">Kembali</button>
          <div className="flex gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-9 h-9 rounded-md border text-sm font-medium ${page === currentPage ? 'bg-green-600 border-green-600 text-white' : 'border-green-500 text-green-600 hover:bg-green-50'}`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== MOBILE ===== */}
      <div className="md:hidden bg-gray-50 min-h-screen pb-20">
        <div className="px-4 pt-4">
          <p className="text-green-700 font-semibold">Digital Amanah</p>
          <p className="text-xs text-gray-400 mb-4">Dashboard Kepala Desa</p>

          <h1 className="text-xl font-bold text-gray-800 mb-1">Semua Surat</h1>
          <p className="text-sm text-gray-500 mb-4">Monitoring seluruh permohonan surat warga</p>

          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              defaultValue={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Jenis Surat..."
              className="w-full border rounded-full pl-9 pr-3 py-2.5 text-sm outline-none focus:border-green-500 bg-white"
            />
          </div>

          <div className="flex gap-2 mb-4">
            <select onChange={(e) => setFilterJenis(e.target.value)} className="flex-1 border rounded-full px-3 py-2 text-xs text-gray-600 bg-white">
              <option value="">Semua Jenis</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex-1 border rounded-full px-3 py-2 text-xs text-gray-600 bg-white">
              <option value="">Semua Status</option>
              <option value="pending">pending</option>
              <option value="rt_approved">rt_approved</option>
              <option value="rt_rejected">rt_rejected</option>
              <option value="rw_approved">rw_approved</option>
              <option value="rw_rejected">rw_rejected</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
            <div className="grid grid-cols-4 text-[10px] font-semibold text-gray-400 uppercase px-4 py-3 border-b">
              <span>No.Surat</span><span>Pemohon</span><span>Jenis</span><span>Tanggal</span>
            </div>
            {loading ? (
              <p className="text-center text-gray-400 text-sm py-8">Memuat...</p>
            ) : paginatedData.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Belum ada surat.</p>
            ) : (
              paginatedData.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className="w-full grid grid-cols-4 items-center text-left px-4 py-3 border-b last:border-0 text-xs"
                >
                  <span className="text-gray-500">{s.letter_number ?? '-'}</span>
                  <span className="font-semibold text-gray-800">{s.applicant_name}</span>
                  <span className="text-gray-600">{s.letter_type?.name ?? '-'}</span>
                  <span className="text-gray-500">{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('id-ID') : '-'}</span>
                </button>
              ))
            )}
          </div>

          <div className="flex justify-center gap-2 mb-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-full text-xs font-medium ${page === currentPage ? 'bg-green-600 text-white' : 'bg-white border text-green-600'}`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>

        <FooterDesa />
        <MobileBottomNav links={ADMIN_MOBILE_LINKS('/admin/dashboard-surat-kades', '/admin/list-kades')} />
      </div>

      <SuratDetailModalKades suratId={selectedId} onClose={() => setSelectedId(null)} />
    </>
  );
}