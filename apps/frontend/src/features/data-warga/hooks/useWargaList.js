
import { useEffect, useMemo, useState } from "react";
import {
  getCitizens,
  getWilayah,
  deleteCitizen,
} from "../api";

const ITEMS_PER_PAGE = 10;

export function useWargaList() {
  const [citizens, setCitizens] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterWilayah, setFilterWilayah] = useState("");
  const [wilayahOptions, setWilayahOptions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);

        const [citizenRes, wilayahRes] = await Promise.all([
          getCitizens(),
          getWilayah(),
        ]);

        if (isMounted) {
          setCitizens(citizenRes.data);
          setWilayahOptions(wilayahRes.data);
        }
      } catch (err) {
        console.error("GET CITIZENS ERROR", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    let result = [...citizens];

    if (search) {
      const keyword = search.toLowerCase();

      result = result.filter(
        (warga) =>
          warga.name?.toLowerCase().includes(keyword) ||
          warga.nik?.includes(keyword)
      );
    }

    if (filterWilayah) {
      result = result.filter(
        (warga) =>
          `${warga.rt_id}-${warga.rw_id}` === filterWilayah
      );
    }

    return result;
  }, [citizens, search, filterWilayah]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / ITEMS_PER_PAGE)
  );

  const data = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;

    return filtered.slice(
      start,
      start + ITEMS_PER_PAGE
    );
  }, [filtered, currentPage]);

  async function removeCitizen(id) {
    await deleteCitizen(id);

    setCitizens((prev) =>
      prev.filter((item) => item.id !== id)
    );
  }

  return {
    data,
    loading,

    setSearch,

    filterWilayah,
    setFilterWilayah,
    wilayahOptions,

    currentPage,
    setCurrentPage,

    totalPages,

    deleteWarga: removeCitizen,
  };
}

