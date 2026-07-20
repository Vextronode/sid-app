// ==========================================
// KadusDetailPage.jsx
// Halaman detail surat Kadus: stepper 6 tahap global, info, aksi Setuju/Tolak.
// ==========================================

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSuratDetail } from '@/features/approval-kadus/hooks/useSuratDetailkadus';
import { useApprovalAction } from '@/features/approval-kadus/hooks/useApprovalActionkadus';
import ApprovalStepperKadus from '@/features/approval-kadus/components/ApprovalStepperKadus';
import SuratInfoGridKadus from '@/features/approval-kadus/components/SuratInfoGridKadus';
import ApprovalActionBarKadus from '@/features/approval-kadus/components/ApprovalActionBarKadus';
import RejectReasonModalKadus from '@/features/approval-kadus/components/RejectReasonModalKadus';
import { getStepIndex } from '@/features/approval/constants/statusFlow';
import { BASE_PATH } from '@/features/approval-kadus/constants/roleConfigkadus';

export default function KadusDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { surat, notFound } = useSuratDetail(id);
  const { approve, reject } = useApprovalAction();
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  if (notFound) return <p className="text-center text-gray-500 py-10">Surat tidak ditemukan.</p>;

  const handleApprove = () => {
    approve(surat.id);
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
        <p className="text-xs text-gray-400 mb-6">#{surat.no_surat ?? `024/${surat.jenis}/V/2026`} · Surat saya</p>

        <ApprovalStepperKadus currentStep={getStepIndex(surat.status)} />
        <SuratInfoGridKadus surat={surat} />

        <ApprovalActionBarKadus
          onApprove={handleApprove}
          onReject={() => setRejectModalOpen(true)}
          onBack={() => navigate(`${BASE_PATH}/list`)}
        />
      </div>

      <RejectReasonModalKadus open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} onSubmit={handleRejectSubmit} />
    </div>
  );
}