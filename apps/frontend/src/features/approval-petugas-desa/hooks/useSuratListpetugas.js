// ==========================================
// useSuratListpetugas.js
// ==========================================

import { useState, useMemo } from 'react';
import { dummySurat } from '@/features/approval/data/dummySurat';
import { RELEVANT_STATUSES } from '../constants/roleConfigpetugas';

export function useSuratList({ initialStatus = '' } = {}) {
  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [version, setVersion] = useState(0);

  const data = useMemo(() => {
    let result = dummySurat.filter((s) => RELEVANT_STATUSES.includes(s.status));

    if (filterJenis) result = result.filter((s) => s.jenis === filterJenis);
    if (filterStatus) result = result.filter((s) => s.status === filterStatus);
    if (search) result = result.filter((s) => s.pemohon.toLowerCase().includes(search.toLowerCase()));

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterJenis, filterStatus, version]);

  const deleteSurat = (id) => {
    const index = dummySurat.findIndex((s) => s.id === id);
    if (index !== -1) dummySurat.splice(index, 1);
    setVersion((v) => v + 1);
  };

  return { data, search, setSearch, filterStatus, setFilterStatus, setFilterJenis, deleteSurat };
}