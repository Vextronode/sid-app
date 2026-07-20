/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
// ==========================================
// RTDetailPage.jsx
// Halaman detail surat RT: stepper (pakai step GLOBAL 6 tahap), info, aksi.
// ==========================================

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSuratDetail } from '@/features/approval-rt/hooks/useSuratDetail';
import { useApprovalAction } from '@/features/approval-rt/hooks/useApprovalAction';
import ApprovalStepperRT from '@/features/approval-rt/components/ApprovalStepperRT';
import SuratInfoGridRT from '@/features/approval-rt/components/SuratInfoGridRT';
import ApprovalActionBarRT from '@/features/approval-rt/components/ApprovalActionBarRT';
import RejectReasonModalRT from '@/features/approval-rt/components/RejectReasonModalRT';
import { getStepIndex } from '@/features/approval/constants/statusFlow';
import { BASE_PATH } from '@/features/approval-rt/constants/roleConfig';

export default function RTDetailPage() {
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

        <ApprovalStepper currentStep={getStepIndex(surat.status)} />
        <SuratInfoGrid surat={surat} />

        <ApprovalActionBar
          onApprove={handleApprove}
          onReject={() => setRejectModalOpen(true)}
          onBack={() => navigate(`${BASE_PATH}/list`)}
        />
      </div>

      <RejectReasonModal open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} onSubmit={handleRejectSubmit} />
    </div>
  );
}