// ==========================================
// RWListPage.jsx
// Desktop: tabel (pakai SuratTableRW yang sudah connect API asli).
// Mobile: kartu list sesuai desain.
// ==========================================

import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useSuratList } from '@/features/approval-rw/hooks/useSuratListRW';
import { useApprovalAction } from '@/features/approval-rw/hooks/useApprovalActionRW';
import SuratTableRW from '@/features/approval-rw/components/SuratTableRW';
import SearchFilterBarRW from '@/features/approval-rw/components/SearchFilterBarRW';
import PaginationRW from '@/features/approval-rw/components/PaginationRW';
import SuratDetailModalRW from '@/features/approval-rw/components/SuratDetailModalRW';
import { BASE_PATH } from '@/features/approval-rw/constants/roleConfigRW';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FooterDesa } from '@/components/layout/FooterDesa';
import { ADMIN_MOBILE_LINKS } from '@/lib/constants/navigation';

const ITEMS_PER_PAGE = 4;

export default function RWListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') ?? '';

  const [currentPage, setCurrentPage] = useState(1);

  const { data, loading, search, setSearch, setFilterJenis, filterStatus, setFilterStatus, refresh } = useSuratList({ initialStatus });
  const { approve, reject } = useApprovalAction();

  const totalPages = Math.max(1, Math.ceil(data.length / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return data.slice(start, start + ITEMS_PER_PAGE);
  }, [data, currentPage]);

  const [selectedId, setSelectedId] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const handleDelete = (id) => {
    // TODO: sambungkan ke endpoint delete kalau sudah ada
    console.log('hapus surat', id);
  };

  const handleApprove = async () => {
    await approve(selectedId);
    setSelectedId(null);
    refresh();
  };

  const handleReject = async (alasan) => {
    await reject(selectedId, alasan);
    setSelectedId(null);
    refresh();
  };

  return (
    <>
      {/* ===== DESKTOP ===== */}
      <div className="hidden md:block max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-gray-800">Semua permohonan surat (RW)</h2>
        </div>
        <SearchFilterBarRW onSearch={setSearch} onFilterJenis={setFilterJenis} onFilterStatus={setFilterStatus} selectedStatus={filterStatus} />
        {loading ? (
          <p className="text-sm text-gray-400 py-8 text-center">Memuat data surat...</p>
        ) : (
          <SuratTableRW
            data={paginatedData}
            onView={(id) => { setSelectedId(id); setIsReadOnly(true); }}
            onEdit={(id) => { setSelectedId(id); setIsReadOnly(false); }}
            onDelete={handleDelete}
          />
        )}
        <div className="flex items-center justify-between mt-4">
          <button onClick={() => navigate(BASE_PATH)} className="border border-green-500 text-green-600 rounded-full px-4 py-1.5 text-sm">Kembali</button>
          <PaginationRW currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </div>

      {/* ===== MOBILE ===== */}
      <div className="md:hidden bg-gray-50 min-h-screen pb-20">
        <div className="px-4 pt-4">
          <p className="text-green-700 font-semibold">Digital Amanah</p>
          <p className="text-xs text-gray-400 mb-4">Dashboard Ketua RW</p>

          <h1 className="text-xl font-bold text-gray-800 mb-1">Semua Surat</h1>
          <p className="text-sm text-gray-500 mb-4">Kelola permohonan surat warga secara digital</p>

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
              <option value="rt_approved">rt_approved</option>
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
              paginatedData.map((surat) => (
                <button
                  key={surat.id}
                  onClick={() => { setSelectedId(surat.id); setIsReadOnly(true); }}
                  className="w-full grid grid-cols-4 items-center text-left px-4 py-3 border-b last:border-0 text-xs"
                >
                  <span className="text-gray-500">{surat.letter_number ?? '-'}</span>
                  <span className="font-semibold text-gray-800">{surat.applicant_name}</span>
                  <span className="text-gray-600">{surat.letter_type?.name ?? '-'}</span>
                  <span className="text-gray-500">{surat.submitted_at ? new Date(surat.submitted_at).toLocaleDateString('id-ID') : '-'}</span>
                </button>
              ))
            )}
          </div>

          <div className="flex justify-center gap-2 mb-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-full text-xs font-medium ${
                  page === currentPage ? 'bg-green-600 text-white' : 'bg-white border text-green-600'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>

        <FooterDesa />
        <MobileBottomNav links={ADMIN_MOBILE_LINKS('/admin/dashboard-surat-rw', '/admin/list-rw')} />
      </div>

      <SuratDetailModalRW
        suratId={selectedId}
        onClose={() => { setSelectedId(null); setIsReadOnly(false); }}
        onApprove={handleApprove}
        onReject={handleReject}
        readOnly={isReadOnly}
      />
    </>
  );
}