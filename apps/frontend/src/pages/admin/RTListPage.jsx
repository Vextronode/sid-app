/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useSuratList } from "@/features/approval-rt/hooks/useSuratList";
import { useApprovalAction } from "@/features/approval-rt/hooks/useApprovalAction";

import SuratTableRT from "@/features/approval-rt/components/SuratTableRT";
import SearchFilterBarRT from "@/features/approval-rt/components/SearchFilterBarRT";
import PaginationRT from "@/features/approval-rt/components/PaginationRT";
import SuratDetailModalRT from "@/features/approval-rt/components/SuratDetailModalRT";

import { BASE_PATH } from "@/features/approval-rt/constants/roleConfig";

export default function RTListPage() {
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

  const suratTypes = [
    ...new Map(
      data
        .filter(item => item.letter_type)
        .map(item => [
          item.letter_type.id,
          item.letter_type
        ])
    ).values()
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
      <SearchFilterBarRT
        onSearch={setSearch}
        onFilterJenis={setFilterJenis}
        onFilterStatus={setFilterStatus}
        selectedStatus={filterStatus}
        suratTypes={suratTypes}
      />

      <SuratTableRT
        data={data}
        onView={(id) => {
          navigate(`/admin/dashboard-surat-rt/detail-permohonan/${id}`);
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

        <PaginationRT
          currentPage={currentPage}
          totalPages={3}
          onPageChange={setCurrentPage}
        />
      </div>

      <SuratDetailModalRT
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