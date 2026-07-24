// ==========================================
// KasiDetailPage.jsx
// Detail surat Kasi (Final Approval).
// ==========================================

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { useSuratDetailKasi } from "@/features/approval-kasi/hooks/useSuratDetailKasi";
import { useApprovalActionKasi } from "@/features/approval-kasi/hooks/useApprovalActionKasi";

import ApprovalStepperKasi from "@/features/approval-kasi/components/ApprovalStepperKasi";
import SuratInfoGridKasi from "@/features/approval-kasi/components/SuratInfoGridKasi";
import ApprovalActionBarKasi from "@/features/approval-kasi/components/ApprovalActionBarKasi";
import RejectReasonModalKasi from "@/features/approval-kasi/components/RejectReasonModalKasi";
import ApprovalHistoryKasi from "@/features/approval-kasi/components/ApprovalHistoryKasi";

import { BASE_PATH } from "@/features/approval-kasi/constants/roleConfigKasi";

export default function KasiDetailPage() {

  const { id } = useParams();

  const navigate = useNavigate();

  const {
    surat,
    isLoading,
    notFound,
  } = useSuratDetailKasi(id);

  const {
    approve,
    reject,
  } = useApprovalActionKasi();

  const [
    rejectModalOpen,
    setRejectModalOpen,
  ] = useState(false);

  // ==========================================
  // Loading
  // ==========================================
  if (isLoading) {

    return (

      <p className="text-center py-10">

        Memuat surat...

      </p>

    );

  }

  // ==========================================
  // Surat tidak ditemukan
  // ==========================================
  if (notFound || !surat) {

    return (

      <p className="text-center py-10 text-gray-500">

        Surat tidak ditemukan.

      </p>

    );

  }

  // ==========================================
  // Final Approve
  // ==========================================
  const handleApprove = async () => {

    try {

      await approve(surat.id);

      alert("Surat berhasil disetujui dan selesai diproses.");

      navigate(`${BASE_PATH}/list`);

    } catch (error) {

      console.error(error);

      alert("Gagal menyetujui surat.");

    }

  };

  // ==========================================
  // Reject
  // ==========================================
  const handleReject = async (notes) => {

    try {

      await reject(
        surat.id,
        notes
      );

      alert("Surat berhasil ditolak.");

      setRejectModalOpen(false);

      navigate(`${BASE_PATH}/list`);

    } catch (error) {

      console.error(error);

      alert("Gagal menolak surat.");

    }

  };

  return (

    <div className="max-w-2xl mx-auto py-16">

      <div className="bg-white rounded-2xl shadow-sm p-8">

        <h2 className="font-medium text-gray-800">

          Detail Permohonan Surat

        </h2>

        <p className="text-xs text-gray-400 mb-6">

          #

          {surat.letter_number ?? surat.id}

          {" "}· Surat warga

        </p>

        {/* Step Approval */}

        <ApprovalStepperKasi
          surat={surat}
        />

        {/* Informasi Surat */}

        <SuratInfoGridKasi
          surat={surat}
        />

        {/* Riwayat Approval */}

        <ApprovalHistoryKasi
          approvals={surat.approvals}
        />

       

        {surat.status === "kadus_approved" ? (
          <ApprovalActionBarKasi
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

      {/* Modal Reject */}

      <RejectReasonModalKasi
        open={rejectModalOpen}
        onClose={() =>
          setRejectModalOpen(false)
        }
        onSubmit={handleReject}
      />

    </div>

  );

}