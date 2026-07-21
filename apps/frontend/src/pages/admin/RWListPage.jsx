/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useSuratList } from "@/features/approval-rw/hooks/useSuratListRW";
import { useApprovalAction } from "@/features/approval-rw/hooks/useApprovalActionRW";

import SuratTableRW from "@/features/approval-rw/components/SuratTableRW";
import SearchFilterBarRW from "@/features/approval-rw/components/SearchFilterBarRW";
import PaginationRW from "@/features/approval-rw/components/PaginationRW";
import SuratDetailModalRW from "@/features/approval-rw/components/SuratDetailModalRW";

import { BASE_PATH } from "@/features/approval-rw/constants/roleConfigRW";

export default function RWListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialStatus = searchParams.get("status") ?? "";

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const {
    data,
    refresh,
    setSearch,
    setFilterJenis,
    filterStatus,
    setFilterStatus,
  } = useSuratList({
    initialStatus,
  });

  // Ambil daftar jenis surat unik dari data backend
  const suratTypes = [
    ...new Map(
      data
        .filter((item) => item.letter_type)
        .map((item) => [
          item.letter_type.id,
          item.letter_type,
        ])
    ).values(),
  ];

  const { approve, reject } = useApprovalAction();

  useEffect(() => {
    setFilterStatus(initialStatus);
  }, [initialStatus, setFilterStatus]);

  const handleDelete = () => {
    alert("Fitur hapus belum tersedia.");
  };

  const handleApprove = async () => {
    await approve(selectedId);

    await refresh();

    setSelectedId(null);
  };

  const handleReject = async (notes) => {
    await reject(selectedId, notes);

    await refresh();

    setSelectedId(null);
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-gray-800">
          Semua permohonan surat
        </h2>

        <button className="border border-green-500 text-green-600 rounded-full px-4 py-1.5 text-sm">
          Tambah Surat
        </button>
      </div>

      <SearchFilterBarRW
        onSearch={setSearch}
        onFilterJenis={setFilterJenis}
        onFilterStatus={setFilterStatus}
        selectedStatus={filterStatus}
        suratTypes={suratTypes}
      />

      <SuratTableRW
        data={data}
        onView={(id) => {
          navigate(`/admin/dashboard-surat-rw/detail-permohonan/${id}`);
        }}
        onEdit={(id) => {
          setSelectedId(id);
          setIsReadOnly(false);
        }}
        onDelete={handleDelete}
      />

      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => navigate(BASE_PATH)}
          className="border border-green-500 text-green-600 rounded-full px-4 py-1.5 text-sm"
        >
          Kembali
        </button>

        <PaginationRW
          currentPage={currentPage}
          totalPages={3}
          onPageChange={setCurrentPage}
        />
      </div>

      <SuratDetailModalRW
        suratId={selectedId}
        readOnly={isReadOnly}
        onClose={() => {
          setSelectedId(null);
          setIsReadOnly(false);
        }}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}