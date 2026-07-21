// ==========================================
// useSuratListkaur.js
// Filter daftar surat khusus Kaur: status relevan DAN jenis surat yang
// jadi tanggung jawab Kaur (bukan semua jenis surat, beda dari role lain).
// ==========================================

import { useState, useMemo } from "react";
import { dummySurat } from "@/features/approval/data/dummySurat";
import { RELEVANT_STATUSES, ROLE_KEY } from "../constants/roleConfigkaur";
import { getPenanggungJawab } from "@/features/approval/constants/jenisSuratConfig";

export function useSuratList({ initialStatus = "" } = {}) {
  const [search, setSearch] = useState("");
  const [filterJenis, setFilterJenis] = useState("");
  const [filterStatus, setFilterStatus] = useState(initialStatus);

  const data = useMemo(() => {
    // Filter dasar: status relevan + jenis surat tanggung jawab Kaur
    let result = dummySurat.filter(
      (s) =>
        RELEVANT_STATUSES.includes(s.status) &&
        getPenanggungJawab(s.jenis) === ROLE_KEY,
    );

    if (filterJenis) result = result.filter((s) => s.jenis === filterJenis);
    if (filterStatus) result = result.filter((s) => s.status === filterStatus);
    if (search)
      result = result.filter((s) =>
        s.pemohon.toLowerCase().includes(search.toLowerCase()),
      );

    return result;
  }, [search, filterJenis, filterStatus]);

  const deleteSurat = (id) => {
    const index = dummySurat.findIndex((s) => s.id === id);
    if (index !== -1) dummySurat.splice(index, 1);
  };

  return {
    data,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    setFilterJenis,
    deleteSurat,
  };
}
