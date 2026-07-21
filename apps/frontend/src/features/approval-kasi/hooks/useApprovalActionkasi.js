import { useState } from 'react';
import { dummySurat } from '@/features/approval/data/dummySurat';
import { ACTION_RESULT, ROLE_LABEL } from '../constants/roleConfigkasi';

export function useApprovalAction() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const approve = (id) => {
    setIsSubmitting(true);
    const surat = dummySurat.find((s) => s.id === id);
    if (surat) {
      surat.status = ACTION_RESULT.approve;
      surat.no_surat = `02${surat.id}/${surat.jenis}/V/2026`;
      surat.riwayat.push({ tahap: ROLE_LABEL, status: 'approved', catatan: null, waktu: new Date().toLocaleString('id-ID') });
    }
    setIsSubmitting(false);
  };

  const reject = (id, alasan) => {
    setIsSubmitting(true);
    const surat = dummySurat.find((s) => s.id === id);
    if (surat) {
      surat.status = ACTION_RESULT.reject;
      surat.riwayat.push({ tahap: ROLE_LABEL, status: 'rejected', catatan: alasan, waktu: new Date().toLocaleString('id-ID') });
    }
    setIsSubmitting(false);
  };

  return { approve, reject, isSubmitting };
}