// ==========================================
// ApprovalDetailPage.jsx
// Halaman detail satu permohonan surat: stepper progress, info pemohon,
// dan tombol aksi Setuju/Tolak/Kembali. Dipakai bersama untuk role RT & RW.
// ==========================================

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSuratDetail } from '@/features/approval/hooks/useSuratDetail';
import { useApprovalAction } from '@/features/approval/hooks/useApprovalAction';
import ApprovalStepper from '@/features/approval/components/ApprovalStepper';
import SuratInfoGrid from '@/features/approval/components/SuratInfoGrid';
import ApprovalActionBar from '@/features/approval/components/ApprovalActionBar';
import RejectReasonModal from '@/features/approval/components/RejectReasonModal';

export default function ApprovalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role; // 'rt' | 'rw'

  const { surat, notFound } = useSuratDetail(id);
  const { approve, reject } = useApprovalAction({ role });

  // Kontrol buka/tutup modal alasan tolak
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  if (notFound) {
    return <p className="text-center text-gray-500 py-10">Surat tidak ditemukan.</p>;
  }

  // Tahap stepper: 0=Submit, 1=RT, 2=RW, 3=Selesai. Ditentukan dari status surat saat ini.
  const stepIndexByStatus = {
    pending: 1,
    rt_approved: 2,
    rt_rejected: 3,
    rw_review: 2,
    rw_approved: 3,
    rw_rejected: 3,
  };
  const steps = [
    { label: 'Submit', timestamp: surat.diajukan_at },
    { label: 'RT', timestamp: surat.status === 'pending' ? null : surat.terakhir_diproses_at },
    { label: 'RW', timestamp: null },
    { label: 'Selesai', timestamp: null },
  ];

  const handleApprove = () => {
    approve(surat.id);
    navigate(-1); // kembali ke list setelah aksi selesai
  };

  const handleRejectSubmit = (alasan) => {
    reject(surat.id, alasan);
    setRejectModalOpen(false);
    navigate(-1);
  };

  return (
    <div className="max-w-2xl mx-auto py-16">
      <div className="bg-white rounded-2xl shadow-sm p-8">
        <h2 className="font-medium text-gray-800">Detail Permohonan Surat</h2>
        <p className="text-xs text-gray-400 mb-6">#{surat.no_surat ?? `024/${surat.jenis}/V/2026`} · Surat saya</p>

        <ApprovalStepper steps={steps} currentStep={stepIndexByStatus[surat.status] ?? 1} />
        <SuratInfoGrid surat={surat} />

        <ApprovalActionBar
          onApprove={handleApprove}
          onReject={() => setRejectModalOpen(true)}
          onBack={() => navigate(-1)}
        />
      </div>

      <RejectReasonModal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onSubmit={handleRejectSubmit}
      />
    </div>
  );
}