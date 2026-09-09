/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */

// ==========================================
// useSuratDetailKadus.js
//
// Mengambil detail surat untuk monitoring Kadus.
//
// Kadus hanya monitoring:
// Submit → RT → Selesai
//
// Tidak ada aksi approve / reject.
// ==========================================

import { useEffect, useState } from "react";
import { getSuratDetail } from "@/features/approval/api";

export function useSuratDetailKadus(id) {
  const [surat, setSurat] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // ==========================================
  // Fetch detail surat
  // ==========================================

  const fetchDetail = async () => {
    if (!id) return;

    try {
      setIsLoading(true);

      const response = await getSuratDetail(id, "kadus");

      setSurat(response.data.data);
      setNotFound(false);
    } catch (error) {
      console.error(
        "GET DETAIL KADUS ERROR:",
        error.response?.data ?? error
      );

      setSurat(null);

      if (error.response?.status === 404) {
        setNotFound(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // Load ketika ID berubah
  // ==========================================

  useEffect(() => {
    if (id) {
      fetchDetail();
    }
  }, [id]);

  // ==========================================
  // Return
  // ==========================================

  return {
    surat,
    isLoading,
    notFound,
    refresh: fetchDetail,
  };
}