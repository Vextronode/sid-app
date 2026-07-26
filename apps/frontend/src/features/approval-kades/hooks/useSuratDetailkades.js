/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { getSuratDetail } from "@/features/approval/api";
import { ROLE_KEY } from "../constants/roleConfigkades";

export function useSuratDetail(id) {
  const [surat, setSurat] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchDetail = async () => {
    try {
      setIsLoading(true);
      const response = await getSuratDetail(id, ROLE_KEY);
      setSurat(response.data.data);
      setNotFound(false);
    } catch (error) {
      console.error("DETAIL ERROR", error.response?.data ?? error);
      if (error.response?.status === 404) setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (id) fetchDetail(); }, [id]);

  return { surat, isLoading, notFound, refresh: fetchDetail };
}