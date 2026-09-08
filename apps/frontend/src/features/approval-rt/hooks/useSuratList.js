import { useEffect, useMemo, useState } from "react";

import { getSuratList } from "@/features/approval/api";
import { RELEVANT_STATUSES } from "../constants/roleConfig";

export function useSuratList({ initialStatus = "" } = {}) {
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterJenis, setFilterJenis] = useState("");
  const [filterStatus, setFilterStatus] = useState(initialStatus);

  // ==========================================
  // Refresh daftar surat
  // ==========================================

  const fetchLetters = async () => {
    try {
      setLoading(true);

      const response = await getSuratList("rt");

      setLetters(response.data.data ?? []);
    } catch (error) {
      console.error(
        "GET RT LETTER ERROR",
        error.response?.data ?? error
      );

      setLetters([]);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // Load awal
  // ==========================================

  useEffect(() => {
    let isMounted = true;

    const loadLetters = async () => {
      try {
        setLoading(true);

        const response = await getSuratList("rt");

        if (isMounted) {
          setLetters(response.data.data ?? []);
        }
      } catch (error) {
        console.error(
          "GET RT LETTER ERROR",
          error.response?.data ?? error
        );

        if (isMounted) {
          setLetters([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadLetters();

    return () => {
      isMounted = false;
    };
  }, []);

  // ==========================================
  // Filter data
  // ==========================================

  const data = useMemo(() => {
    let result = [...letters];

    result = result.filter((letter) =>
      RELEVANT_STATUSES.includes(letter.status)
    );

    // Filter jenis surat
    if (filterJenis) {
      result = result.filter(
        (letter) =>
          letter.letter_type?.name === filterJenis
      );
    }

    // Filter status
    if (filterStatus) {
      result = result.filter(
        (letter) =>
          letter.status === filterStatus
      );
    }

    // Pencarian nama pemohon
    if (search) {
      result = result.filter(
        (letter) =>
          letter.applicant_name
            ?.toLowerCase()
            .includes(search.toLowerCase())
      );
    }

    return result;
  }, [
    letters,
    filterJenis,
    filterStatus,
    search,
  ]);

  return {
    data,

    loading,

    search,
    setSearch,

    filterJenis,
    setFilterJenis,

    filterStatus,
    setFilterStatus,

    refresh: fetchLetters,
  };
}