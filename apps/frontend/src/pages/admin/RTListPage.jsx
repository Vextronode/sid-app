/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useSuratList } from '@/features/approval-rt/hooks/useSuratList';
import { useApprovalAction } from '@/features/approval-rt/hooks/useApprovalAction';
import SuratTableRT from '@/features/approval-rt/components/SuratTableRT';
import SearchFilterBarRT from '@/features/approval-rt/components/SearchFilterBarRT';
import PaginationRT from '@/features/approval-rt/components/PaginationRT';
import SuratDetailModalRT from '@/features/approval-rt/components/SuratDetailModalRT';
import StatusBadgeRT from '@/features/approval-rt/components/StatusBadgeRT';
import { BASE_PATH } from '@/features/approval-rt/constants/roleConfig';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FooterDesa } from '@/components/layout/FooterDesa';
import { ADMIN_MOBILE_LINKS } from '@/lib/constants/navigation';
import { Eye, Pencil } from 'lucide-react';

const ITEMS_PER_PAGE = 4;

export default function RTListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') ?? '';
  const [currentPage, setCurrentPage] = useState(1);

  const { data, search, setSearch, setFilterJenis, filterStatus, setFilterStatus, deleteSurat } = useSuratList({ initialStatus });
  const { approve, reject } = useApprovalAction();

  useEffect(() => { setFilterStatus(initialStatus); setCurrentPage(1); }, [initialStatus]);
  useEffect(() => { setCurrentPage(1); }, [search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(data.length / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return data.slice(start, start + ITEMS_PER_PAGE);
  }, [data, currentPage]);

  const [selectedId, setSelectedId] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const handleDelete = (id) => { if (confirm('Yakin mau hapus surat ini?')) deleteSurat(id); };
  const handleApprove = () => { approve(selectedId); setSelectedId(null); };
  const handleReject = (alasan) => { reject(selectedId, alasan); setSelectedId(null); };

  return (
    <>
      {/* ===== DESKTOP ===== */}
      <div className="hidden md:block max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-gray-800">Semua permohonan surat</h2>
          <button className="border border-green-500 text-green-600 rounded-full px-4 py-1.5 text-sm">Tambah Surat</button>
        </div>
        <SearchFilterBarRT onSearch={setSearch} onFilterJenis={setFilterJenis} onFilterStatus={setFilterStatus} selectedStatus={filterStatus} />
        <SuratTableRT
          data={paginatedData}
          onView={(id) => { setSelectedId(id); setIsReadOnly(true); }}
          onEdit={(id) => { setSelectedId(id); setIsReadOnly(false); }}
          onDelete={handleDelete}
        />
        <div className="flex items-center justify-between mt-4">
          <button onClick={() => navigate(BASE_PATH)} className="border border-green-500 text-green-600 rounded-full px-4 py-1.5 text-sm">Kembali</button>
          <PaginationRT currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </div>

      {/* ===== MOBILE ===== */}
      <div className="md:hidden bg-gray-50 min-h-screen pb-20">
        <div className="px-4 pt-4">
          <p className="text-green-700 font-semibold">Digital Amanah</p>
          <p className="text-xs text-gray-400 mb-4">Dashboard Ketua RT</p>

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
              <option value="SKD">SKD</option><option value="SKBM">SKBM</option><option value="SKU">SKU</option>
              <option value="SKTMR">SKTMR</option><option value="SKP">SKP</option><option value="SKTM">SKTM</option>
              <option value="SKBN">SKBN</option><option value="SKPG">SKPG</option><option value="SKK">SKK</option>
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
            {paginatedData.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Belum ada surat.</p>
            ) : (
              paginatedData.map((surat) => (
                <button
                  key={surat.id}
                  onClick={() => { setSelectedId(surat.id); setIsReadOnly(true); }}
                  className="w-full grid grid-cols-4 items-center text-left px-4 py-3 border-b last:border-0 text-xs"
                >
                  <span className="text-gray-500">{surat.no_surat ?? '-'}</span>
                  <span className="font-semibold text-gray-800">{surat.pemohon}</span>
                  <span className="text-gray-600">{surat.jenis}</span>
                  <span className="text-gray-500">{surat.tanggal}</span>
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