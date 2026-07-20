// ==========================================
// RWDetailPage.jsx
// Halaman detail surat RW: stepper 6 tahap global, info, aksi Setuju/Tolak.
// ==========================================

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSuratDetail } from '@/features/approval-rw/hooks/useSuratDetailRW';
import { useApprovalAction } from '@/features/approval-rw/hooks/useApprovalActionRW';
import ApprovalStepperRW from '@/features/approval-rw/components/ApprovalStepperRW';
import SuratInfoGridRW from '@/features/approval-rw/components/SuratInfoGridRW';
import ApprovalActionBarRW from '@/features/approval-rw/components/ApprovalActionBarRW';
import RejectReasonModalRW from '@/features/approval-rw/components/RejectReasonModalRW';
import { getStepIndex } from '@/features/approval/constants/statusFlow';
import { BASE_PATH } from '@/features/approval-rw/constants/roleConfigRW';

export default function RWDetailPage() {
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

        <ApprovalStepperRW currentStep={getStepIndex(surat.status)} />
        <SuratInfoGridRW surat={surat} />

        <ApprovalActionBarRW
          onApprove={handleApprove}
          onReject={() => setRejectModalOpen(true)}
          onBack={() => navigate(`${BASE_PATH}/list`)}
        />
      </div>

      <RejectReasonModalRW open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} onSubmit={handleRejectSubmit} />
    </div>
  );
}