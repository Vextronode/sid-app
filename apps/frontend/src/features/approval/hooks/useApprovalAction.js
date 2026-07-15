// ==========================================
// useApprovalAction.js
// Hook untuk eksekusi aksi Setuju / Tolak pada satu surat, sesuai role
// yang sedang login. Saat ini masih memodifikasi dummySurat.js langsung
// di memory (belum ada backend) — nanti diganti call approveSurat/rejectSurat dari api.js.
// ==========================================

import { useState } from 'react';
import { dummySurat } from '../data/dummySurat';
import { ACTION_RESULT_BY_ROLE } from '../constants/statusConfig';

export function useApprovalAction({ role }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Setujui surat: ubah status sesuai hasil approve untuk role saat ini
  // (RT -> rt_approved, RW -> rw_approved).
  const approve = (id) => {
    setIsSubmitting(true);
    const surat = dummySurat.find((s) => s.id === id);
    if (surat) surat.status = ACTION_RESULT_BY_ROLE[role].approve;
    setIsSubmitting(false);
  };

  // Tolak surat: ubah status sesuai hasil reject untuk role saat ini,
  // dan simpan alasan penolakan ke riwayat surat.
  const reject = (id, alasan) => {
    setIsSubmitting(true);
    const surat = dummySurat.find((s) => s.id === id);
    if (surat) {
      surat.status = ACTION_RESULT_BY_ROLE[role].reject;
      surat.riwayat.push({
        tahap: role.toUpperCase(),
        status: 'rejected',
        catatan: alasan,
        waktu: new Date().toLocaleString('id-ID'),
      });
    }
    setIsSubmitting(false);
  };

  return { approve, reject, isSubmitting };
}