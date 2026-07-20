// ==========================================
// PetugasDesaDetailPage.jsx
// Halaman detail surat Petugas Desa: stepper 6 tahap global, info, aksi.
// Setuju di sini = tahap final, otomatis menerbitkan nomor surat (lihat useApprovalAction).
// ==========================================

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSuratDetail } from "@/features/approval-petugas-desa/hooks/useSuratDetailpetugas";
import { useApprovalAction } from "@/features/approval-petugas-desa/hooks/useApprovalActionpetugas";
import ApprovalStepperPetugasDesa from "@/features/approval-petugas-desa/components/ApprovalStepperpetugas";
import SuratInfoGridPetugasDesa from "@/features/approval-petugas-desa/components/SuratInfoGridpetugas";
import ApprovalActionBarPetugasDesa from "@/features/approval-petugas-desa/components/ApprovalActionBarpetugas";
import RejectReasonModalPetugasDesa from "@/features/approval-petugas-desa/components/RejectReasonModalpetugas";
import { getStepIndex } from "@/features/approval/constants/statusFlow";
import { BASE_PATH } from "@/features/approval-petugas-desa/constants/roleConfigpetugas";

export default function PetugasDesaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { surat, notFound } = useSuratDetail(id);
  const { approve, reject } = useApprovalAction();
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  if (notFound)
    return (
      <p className="text-center text-gray-500 py-10">Surat tidak ditemukan.</p>
    );

  const handleApprove = () => {
    approve(surat.id); // tahap final, no_surat otomatis terbit di useApprovalAction
    navigate(`${BASE_PATH}/list`);
  };

  const handleRejectSubmit = (alasan) => {
    reject(surat.id, alasan);
    setRejectModalOpen(false);
    navigate(`${BASE_PATH}/list`);
  };

  return (
    <div className="max-w-2xl mx-auto py-16">
      <div className="bg-white rounded-2xl shadow-sm p-8">
        <h2 className="font-medium text-gray-800">Detail Permohonan Surat</h2>
        <p className="text-xs text-gray-400 mb-6">
          #{surat.no_surat ?? `024/${surat.jenis}/V/2026`} · Surat saya
        </p>

        <ApprovalStepperPetugasDesa currentStep={getStepIndex(surat.status)} />
        <SuratInfoGridPetugasDesa surat={surat} />

        <ApprovalActionBarPetugasDesa
          onApprove={handleApprove}
          onReject={() => setRejectModalOpen(true)}
          onBack={() => navigate(`${BASE_PATH}/list`)}
        />
      </div>

      <RejectReasonModalPetugasDesa
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onSubmit={handleRejectSubmit}
      />
    </div>
  );
}
