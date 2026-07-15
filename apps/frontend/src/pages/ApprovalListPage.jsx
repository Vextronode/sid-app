// ==========================================
// ApprovalListPage.jsx
// Halaman daftar surat dengan tab (semua/pending/rejected/approved),
// tabel, dan pagination. Dipakai bersama untuk role RT & RW.
// Tab "semua" menampilkan SearchFilterBar tambahan (read-only, semua status campur).
// ==========================================

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSuratList } from '@/features/approval/hooks/useSuratList';
import StatusTabs from '@/features/approval/components/StatusTabs';
import SuratTable from '@/features/approval/components/SuratTable';
import SearchFilterBar from '@/features/approval/components/SearchFilterBar';
import Pagination from '@/features/approval/components/Pagination';
import { LIST_TITLE_BY_ROLE } from '@/features/approval/constants/statusConfig';

const TABS = [
  { value: 'semua', label: 'semua' },
  { value: 'pending', label: 'pending' },
  { value: 'rejected', label: 'rejected' },
  { value: 'approved', label: 'Approved' },
];

export default function ApprovalListPage() {
  const { user } = useAuth();
  const role = user?.role; // 'rt' | 'rw'
  const navigate = useNavigate();

  // Tab aktif disimpan di query param (?tab=pending) supaya bisa direct link / refresh
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'pending';

  const [currentPage, setCurrentPage] = useState(1);

  const { data, setSearch, setFilterJenis, setFilterStatus } = useSuratList({ role, tab: activeTab });

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
    setCurrentPage(1); // reset ke halaman 1 tiap pindah tab
  };

  return (
    <div className="max-w-5xl mx-auto">
      <StatusTabs tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-gray-800">
            {LIST_TITLE_BY_ROLE[role]?.[activeTab] ?? 'Daftar Surat'}
          </h2>
          <button className="border border-green-500 text-green-600 rounded-full px-4 py-1.5 text-sm">
            Tambah Surat
          </button>
        </div>

        {/* Search & filter hanya relevan di tab "semua" karena isinya campuran semua status */}
        {activeTab === 'semua' && (
          <SearchFilterBar onSearch={setSearch} onFilterJenis={setFilterJenis} onFilterStatus={setFilterStatus} />
        )}

        <SuratTable
          data={data}
          onView={(id) => navigate(`/dashboard-surat/${id}`)}
          onEdit={(id) => navigate(`/dashboard-surat/${id}/edit`)}
          onDelete={(id) => console.log('hapus surat', id)} // TODO: sambungkan ke konfirmasi hapus + api
        />

        <div className="flex items-center justify-between mt-4">
          <button onClick={() => navigate(-1)} className="border border-green-500 text-green-600 rounded-full px-4 py-1.5 text-sm">
            ✓ Kembali
          </button>
          <Pagination currentPage={currentPage} totalPages={3} onPageChange={setCurrentPage} />
        </div>
      </div>
    </div>
  );
}