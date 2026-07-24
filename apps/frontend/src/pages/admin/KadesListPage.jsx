/* eslint-disable react-hooks/set-state-in-effect */
// ==========================================
// KadesListPage.jsx
// Halaman list surat untuk Kades: search, filter, tabel read-only,
// pagination. TIDAK ADA tombol Tambah Surat, Edit, atau Hapus.
// ==========================================

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSuratList } from '@/features/approval-kades/hooks/useSuratListkades';
import SuratTablekades from '@/features/approval-kades/components/SuratTablekades';
import SearchFilterBarRT from '@/features/approval-rt/components/SearchFilterBarRT'; // reuse search bar generic
import PaginationRT from '@/features/approval-rt/components/PaginationRT'; // reuse pagination generic
import SuratDetailModalkades from '@/features/approval-kades/components/SuratDetailModalkades';
import { BASE_PATH } from '@/features/approval-kades/constants/roleConfigkades';

const ITEMS_PER_PAGE = 4;

export default function KadesListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') ?? '';
  const [currentPage, setCurrentPage] = useState(1);

  const { data, search, setSearch, setFilterJenis, filterStatus, setFilterStatus } = useSuratList({ initialStatus });

  useEffect(() => {
    setFilterStatus(initialStatus);
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(data.length / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return data.slice(start, start + ITEMS_PER_PAGE);
  }, [data, currentPage]);

  const [selectedId, setSelectedId] = useState(null);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="font-medium text-gray-800 mb-4">Semua surat level desa (read-only)</h2>

      <SearchFilterBarRT
        onSearch={setSearch}
        onFilterJenis={setFilterJenis}
        onFilterStatus={setFilterStatus}
        selectedStatus={filterStatus}
      />

      <SuratTablekades data={paginatedData} onView={(id) => setSelectedId(id)} />

      <div className="flex items-center justify-between mt-4">
        <button onClick={() => navigate(BASE_PATH)} className="border border-green-500 text-green-600 rounded-full px-4 py-1.5 text-sm">
          Kembali
        </button>
        <PaginationRT currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      <SuratDetailModalkades suratId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}