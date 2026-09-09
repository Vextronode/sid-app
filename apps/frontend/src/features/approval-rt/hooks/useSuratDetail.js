// ==========================================
// useSuratDetail.js
// Mengambil detail surat untuk RT.
// ==========================================

import { useEffect, useState } from "react";
import { getSuratDetail } from "@/features/approval/api";

export function useSuratDetail(id) {
  const [surat, setSurat] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [notFound, setNotFound] = useState(false);

  // ==========================================
  // Refresh detail surat
  // ==========================================

  const refresh = async () => {
    if (!id) return;

    try {
      setIsLoading(true);

      const response = await getSuratDetail(id, "rt");

      setSurat(response.data.data);
      setNotFound(false);
    } catch (error) {
      console.error(
        "DETAIL ERROR",
        error.response?.data ?? error
      );

      if (error.response?.status === 404) {
        setNotFound(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // Load ketika id berubah
  // ==========================================

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    const loadDetail = async () => {
      try {
        setIsLoading(true);

        const response = await getSuratDetail(id, "rt");

        if (isMounted) {
          setSurat(response.data.data);
          setNotFound(false);
        }
      } catch (error) {
        console.error(
          "DETAIL ERROR",
          error.response?.data ?? error
        );

        if (
          isMounted &&
          error.response?.status === 404
        ) {
          setNotFound(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);

  return {
    surat,
    isLoading,
    notFound,
    refresh,
  };
}