// ==========================================
// useApprovalAction.js
// Eksekusi Setuju/Tolak. Hasil status-nya ditentukan roleConfig.js masing-masing
// role (RT -> rt_approved/rt_rejected, RW -> rw_approved/rw_rejected, dst).
// ==========================================

import { useState } from "react";
import { dummySurat } from "@/features/approval/data/dummySurat";
import { ACTION_RESULT, ROLE_LABEL } from "../constants/roleConfigRW";

export function useApprovalAction() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const approve = (id) => {
    setIsSubmitting(true);
    const surat = dummySurat.find((s) => s.id === id);
    if (surat) {
      surat.status = ACTION_RESULT.approve;
      surat.riwayat.push({
        tahap: ROLE_LABEL,
        status: "approved",
        catatan: null,
        waktu: new Date().toLocaleString("id-ID"),
      });
      // Kalau ini tahap final (Petugas Desa), otomatis terbitkan nomor surat
      if (ACTION_RESULT.approve === "petugas_approved") {
        surat.no_surat = `02${surat.id}/${surat.jenis}/V/2026`;
      }
    }
    setIsSubmitting(false);
  };

  const reject = (id, alasan) => {
    setIsSubmitting(true);
    const surat = dummySurat.find((s) => s.id === id);
    if (surat) {
      surat.status = ACTION_RESULT.reject;
      surat.riwayat.push({
        tahap: ROLE_LABEL,
        status: "rejected",
        catatan: alasan,
        waktu: new Date().toLocaleString("id-ID"),
      });
    }
    setIsSubmitting(false);
  };

  return { approve, reject, isSubmitting };
}
