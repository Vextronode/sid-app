/* eslint-disable react-hooks/set-state-in-effect */
// ==========================================
// KadusListPage.jsx
// Halaman list surat Kadus. Sama polanya dengan RT/RW: tanpa tab bar,
// filter via dropdown status, detail lewat modal, pagination berfungsi.
// ==========================================

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSuratList } from '@/features/approval-kadus/hooks/useSuratListkadus';
import { useApprovalAction } from '@/features/approval-kadus/hooks/useApprovalActionkadus';
import SuratTablekadus from '@/features/approval-kadus/components/SuratTablekadus';
import SearchFilterBarkadus from '@/features/approval-kadus/components/SearchFilterBarkadus';
import Paginationkadus from '@/features/approval-kadus/components/Paginationkadus';
import SuratDetailModalkadus from '@/features/approval-kadus/components/SuratDetailModalkadus';
import { BASE_PATH } from '@/features/approval-kadus/constants/roleConfigkadus';

const ITEMS_PER_PAGE = 4;

export default function KadusListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') ?? '';
  const [currentPage, setCurrentPage] = useState(1);

  const { data, search, setSearch, setFilterJenis, filterStatus, setFilterStatus, deleteSurat } = useSuratList({ initialStatus });
  const { approve, reject } = useApprovalAction();

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
  const [isReadOnly, setIsReadOnly] = useState(false);

  const handleDelete = (id) => {
    if (confirm('Yakin mau hapus surat ini?')) deleteSurat(id);
  };

  const handleApprove = () => {
    approve(selectedId);
    setSelectedId(null);
  };

  const handleReject = (alasan) => {
    reject(selectedId, alasan);
    setSelectedId(null);
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-gray-800">Semua permohonan surat</h2>
        <button className="border border-green-500 text-green-600 rounded-full px-4 py-1.5 text-sm">Tambah Surat</button>
      </div>

      <SearchFilterBarkadus
        onSearch={setSearch}
        onFilterJenis={setFilterJenis}
        onFilterStatus={setFilterStatus}
        selectedStatus={filterStatus}
      />

      <SuratTablekadus
        data={paginatedData}
        onView={(id) => { setSelectedId(id); setIsReadOnly(true); }}
        onEdit={(id) => { setSelectedId(id); setIsReadOnly(false); }}
        onDelete={handleDelete}
      />

      <div className="flex items-center justify-between mt-4">
        <button onClick={() => navigate(BASE_PATH)} className="border border-green-500 text-green-600 rounded-full px-4 py-1.5 text-sm">
          Kembali
        </button>
        <Paginationkadus currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      <SuratDetailModalkadus
        suratId={selectedId}
        onClose={() => { setSelectedId(null); setIsReadOnly(false); }}
        onApprove={handleApprove}
        onReject={handleReject}
        readOnly={isReadOnly}
      />
    </div>
  );
}