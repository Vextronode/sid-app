// ==========================================
// useApprovalActionKasi.js
// Hook approve / reject surat oleh Kasi.
// Kasi menggunakan endpoint approval.
// ==========================================

import { useState } from "react";

import {
  approveSurat
} from "@/features/approval/api";


export function useApprovalActionKasi() {

  const [
    isSubmitting,
    setIsSubmitting
  ] = useState(false);



  // ==========================================
  // Approve Kasi
  // ==========================================
  const approve = async (id) => {

    try {

      setIsSubmitting(true);

      await approveSurat(
        "kasi",
        id,
        "approved"
      );

      return true;


    } catch(error) {

      console.error(
        "KASI APPROVE ERROR",
        error.response?.data ?? error
      );

      throw error;


    } finally {

      setIsSubmitting(false);

    }

  };



  // ==========================================
  // Reject Kasi
  // ==========================================
  const reject = async (
    id,
    notes
  ) => {

    try {

      setIsSubmitting(true);

      await approveSurat(
        "kasi",
        id,
        "rejected",
        notes
      );

      return true;


    } catch(error) {

      console.error(
        "KASI REJECT ERROR",
        error.response?.data ?? error
      );

      throw error;


    } finally {

      setIsSubmitting(false);

    }

  };



  return {

    approve,

    reject,

    isSubmitting,

  };

}