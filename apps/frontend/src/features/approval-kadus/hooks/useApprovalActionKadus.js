import { useState } from "react";
import { submitDecision } from "@/features/approval/api";

export function useApprovalActionKadus() {

  const [isSubmitting, setIsSubmitting] = useState(false);

  const approve = async (id) => {

    try {

      setIsSubmitting(true);

      await submitDecision(
        "kadus",
        id,
        "approved"
      );

      return true;

    } catch (error) {

      console.error(
        "KADUS APPROVE ERROR",
        error.response?.data ?? error
      );

      throw error;

    } finally {

      setIsSubmitting(false);

    }

  };



  const reject = async (id, notes) => {

    try {

      setIsSubmitting(true);

      await submitDecision(
        "kadus",
        id,
        "rejected",
        notes
      );

      return true;

    } catch (error) {

      console.error(
        "KADUS REJECT ERROR",
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