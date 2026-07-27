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
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [citizenRes, wilayahRes] = await Promise.all([
        getCitizens(),
        getWilayah(),
      ]);

      setCitizens(citizenRes.data);
      setWilayahOptions(wilayahRes.data);
    } catch (err) {
      console.error("GET CITIZENS ERROR", err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let result = [...citizens];

    if (search) {
      const keyword = search.toLowerCase();

      result = result.filter(
        (w) =>
          w.name?.toLowerCase().includes(keyword) ||
          w.nik?.includes(keyword)
      );
    }

    if (filterWilayah) {
      result = result.filter(
        (w) =>
          `${w.rt_id}-${w.rw_id}` === filterWilayah
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

    return filtered.slice(start, start + ITEMS_PER_PAGE);
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