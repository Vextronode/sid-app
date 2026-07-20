/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSuratList } from '@/features/approval-rt/hooks/useSuratList';
import { useApprovalAction } from '@/features/approval-rt/hooks/useApprovalAction';
import SuratTableRT from '@/features/approval-rt/components/SuratTableRT';
import SearchFilterBarRT from '@/features/approval-rt/components/SearchFilterBarRT';
import PaginationRT from '@/features/approval-rt/components/PaginationRT';
import SuratDetailModalRT from '@/features/approval-rt/components/SuratDetailModalRT';
import { BASE_PATH } from '@/features/approval-rt/constants/roleConfig';

export default function RTListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Kalau datang dari quick-nav dashboard (?status=pending), jadi filter awal
  const initialStatus = searchParams.get('status') ?? '';
  const [currentPage, setCurrentPage] = useState(1);

  const { data, setSearch, setFilterJenis, filterStatus, setFilterStatus, deleteSurat } = useSuratList({ initialStatus });
  const { approve, reject } = useApprovalAction();

  // Setiap kali query param ?status= berubah (misal klik quick-nav dashboard lagi
  // tanpa pindah halaman penuh), paksa filter ikut update.
  useEffect(() => {
    setFilterStatus(initialStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStatus]);

  // id surat yang sedang dibuka modal-nya; null = modal tertutup
  const [selectedId, setSelectedId] = useState(null);

  const [isReadOnly, setIsReadOnly] = useState(false);

  const handleDelete = (id) => {
    if (confirm('Yakin mau hapus surat ini?')) {
      deleteSurat(id);
    }
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

      <SearchFilterBarRT
        onSearch={setSearch}
        onFilterJenis={setFilterJenis}
        onFilterStatus={setFilterStatus}
        selectedStatus={filterStatus}
      />

      <SuratTableRT
        data={data}
        onView={(id) => { setSelectedId(id); setIsReadOnly(true); }}
        onEdit={(id) => { setSelectedId(id); setIsReadOnly(false); }}
        onDelete={handleDelete}
      />

      <div className="flex items-center justify-between mt-4">
        <button onClick={() => navigate(BASE_PATH)} className="border border-green-500 text-green-600 rounded-full px-4 py-1.5 text-sm">
          Kembali
        </button>
        <PaginationRT currentPage={currentPage} totalPages={3} onPageChange={setCurrentPage} />
      </div>

      {/* Modal detail surat, muncul kalau selectedId terisi */}
      <SuratDetailModalRT
        suratId={selectedId}
        onClose={() => { setSelectedId(null); setIsReadOnly(false); }}
        onApprove={handleApprove}
        readOnly={isReadOnly}
      />
    </div>
  );
}