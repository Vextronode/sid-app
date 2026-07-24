// ==========================================
// KadusDetailPage.jsx
// Detail surat Kadus.
// ==========================================

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { useSuratDetailKadus } from "@/features/approval-kadus/hooks/useSuratDetailKadus";
import { useApprovalActionKadus } from "@/features/approval-kadus/hooks/useApprovalActionKadus";

import ApprovalStepperKadus from "@/features/approval-kadus/components/ApprovalStepperKadus";
import SuratInfoGridKadus from "@/features/approval-kadus/components/SuratInfoGridKadus";
import ApprovalActionBarKadus from "@/features/approval-kadus/components/ApprovalActionBarKadus";
import RejectReasonModalKadus from "@/features/approval-kadus/components/RejectReasonModalKadus";
import ApprovalHistoryKadus from "@/features/approval-kadus/components/ApprovalHistoryKadus";

import { BASE_PATH } from "@/features/approval-kadus/constants/roleConfigKadus";

export default function KadusDetailPage() {

  const { id } = useParams();

  const navigate = useNavigate();

  const {
    surat,
    isLoading,
    notFound,
  } = useSuratDetailKadus(id);

  const {
    approve,
    reject,
  } = useApprovalActionKadus();
  
  const [
    rejectModalOpen,
    setRejectModalOpen,
  ] = useState(false);

  if (isLoading) {
    return (
      <p className="text-center py-10">
        Memuat surat...
      </p>
    );
  }

  if (notFound || !surat) {
    return (
      <p className="text-center py-10 text-gray-500">
        Surat tidak ditemukan.
      </p>
    );
  }

  const handleApprove = async () => {

    try {

      await approve(surat.id);

      alert("Surat berhasil disetujui");

      navigate(`${BASE_PATH}/list`);

    } catch (error) {

      console.error(error);

      alert("Gagal approve surat");

    }

  };

  const handleReject = async (notes) => {

    try {

      await reject(
        surat.id,
        notes
      );

      alert("Surat berhasil ditolak");

      setRejectModalOpen(false);

      navigate(`${BASE_PATH}/list`);

    } catch (error) {

      console.error(error);

      alert("Gagal menolak surat");

    }

  };
  
  return (

    <div className="max-w-2xl mx-auto py-16">

      <div className="bg-white rounded-2xl shadow-sm p-8">

        <h2 className="font-medium text-gray-800">
          Detail Permohonan Surat
        </h2>

        <p className="text-xs text-gray-400 mb-6">
          #{surat.letter_number ?? surat.id}
          {" "}· Surat warga
        </p>

        <ApprovalStepperKadus
          surat={surat}
        />

        <SuratInfoGridKadus
          surat={surat}
        />

        <ApprovalHistoryKadus
          approvals={surat.approvals}
        />

{surat.status === "rw_approved" ? (
  <ApprovalActionBarKadus
    onApprove={handleApprove}
    onReject={() =>
      setRejectModalOpen(true)
    }
    onBack={() =>
      navigate(`${BASE_PATH}/list`)
    }
  />
) : (
  <div className="mt-6">
    <button
      onClick={() => navigate(`${BASE_PATH}/list`)}
      className="border border-green-500 text-green-600 px-4 py-2 rounded-md"
    >
      Kembali
    </button>
  </div>
)}

      </div>

      <RejectReasonModalKadus
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onSubmit={handleReject}
      />

    </div>

  );

}