/* eslint-disable no-unused-vars */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useSuratListKadus } from "@/features/approval-kadus/hooks/useSuratListKadus";
import { useApprovalActionKadus } from "@/features/approval-kadus/hooks/useApprovalActionKadus";

import SuratTableKadus from "@/features/approval-kadus/components/SuratTableKadus";
import SearchFilterBarKadus from "@/features/approval-kadus/components/SearchFilterBarKadus";
import PaginationKadus from "@/features/approval-kadus/components/PaginationKadus";
import SuratDetailModalKadus from "@/features/approval-kadus/components/SuratDetailModalKadus";

import { BASE_PATH } from "@/features/approval-kadus/constants/roleConfigKadus";

export default function KadusListPage() {

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const initialStatus =
    searchParams.get("status") ?? "";

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    selectedId,
    setSelectedId,
  ] = useState(null);

  const [
    isReadOnly,
    setIsReadOnly,
  ] = useState(false);

  const {
    data,
    refresh,
    setSearch,
    setFilterJenis,
    filterStatus,
    setFilterStatus,
  } = useSuratListKadus({
    initialStatus,
  });

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

  const {
    approve,
    reject,
  } = useApprovalActionKadus();

  useEffect(() => {

    setFilterStatus(initialStatus);

  }, [
    initialStatus,
    setFilterStatus,
  ]);

  const handleDelete = () => {

    alert("Fitur hapus belum tersedia.");

  };

  const handleApprove = async () => {

    await approve(selectedId);

    await refresh();

    setSelectedId(null);

  };

  const handleReject = async (notes) => {

    await reject(
      selectedId,
      notes
    );

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

      <SearchFilterBarKadus
        onSearch={setSearch}
        onFilterJenis={setFilterJenis}
        onFilterStatus={setFilterStatus}
        selectedStatus={filterStatus}
        suratTypes={suratTypes}
      />

      <SuratTableKadus
        data={data}
        onView={(id) => {

          navigate(
            `/admin/dashboard-surat-kadus/detail-permohonan/${id}`
          );

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

        <PaginationKadus
          currentPage={currentPage}
          totalPages={3}
          onPageChange={setCurrentPage}
        />

      </div>

      <SuratDetailModalKadus
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