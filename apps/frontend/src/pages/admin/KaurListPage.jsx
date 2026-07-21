/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSuratList } from '@/features/approval-kaur/hooks/useSuratListkaur';
import { useApprovalAction } from '@/features/approval-kaur/hooks/useApprovalActionkaur';
import SuratTablekaur from '@/features/approval-kaur/components/SuratTablekaur';
import SearchFilterBarkaur from '@/features/approval-kaur/components/SearchFilterBarkaur';
import Paginationkaur from '@/features/approval-kaur/components/Paginationkaur';
import SuratDetailModalkaur from '@/features/approval-kaur/components/SuratDetailModalkaur';
import { BASE_PATH } from '@/features/approval-kaur/constants/roleConfigkaur';

const ITEMS_PER_PAGE = 4;

export default function KaurListPage() {
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
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-gray-800">Semua permohonan surat (Kaur)</h2>
        <button className="border border-green-500 text-green-600 rounded-full px-4 py-1.5 text-sm">Tambah Surat</button>
      </div>
      <SearchFilterBarkaur onSearch={setSearch} onFilterJenis={setFilterJenis} onFilterStatus={setFilterStatus} selectedStatus={filterStatus} />
      <SuratTablekaur
        data={paginatedData}
        onView={(id) => { setSelectedId(id); setIsReadOnly(true); }}
        onEdit={(id) => { setSelectedId(id); setIsReadOnly(false); }}
        onDelete={handleDelete}
      />
      <div className="flex items-center justify-between mt-4">
        <button onClick={() => navigate(BASE_PATH)} className="border border-green-500 text-green-600 rounded-full px-4 py-1.5 text-sm">Kembali</button>
        <Paginationkaur currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>
      <SuratDetailModalkaur suratId={selectedId} onClose={() => { setSelectedId(null); setIsReadOnly(false); }} onApprove={handleApprove} onReject={handleReject} readOnly={isReadOnly} />
    </div>
  );
}