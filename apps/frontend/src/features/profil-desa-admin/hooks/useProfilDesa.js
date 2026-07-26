// ==========================================
// useProfilDesa.js
// State profil desa + fungsi update tiap section (mutasi langsung ke
// dummy object, nanti diganti call API PUT waktu backend siap).
// ==========================================

import { useState } from 'react';
import { profilDesa } from '../data/dummyProfilDesa';

export function useProfilDesa() {
  const [version, setVersion] = useState(0);

  const updateHeroAndStats = (data) => {
    Object.assign(profilDesa.hero, data.hero);
    Object.assign(profilDesa.stats, data.stats);
    setVersion((v) => v + 1);
  };

  const updateVisiMisi = (data) => {
    Object.assign(profilDesa.visiMisi, data);
    setVersion((v) => v + 1);
  };

  const updatePerangkat = (perangkatUtama, kadusList) => {
    Object.assign(profilDesa.perangkatUtama, perangkatUtama);
    profilDesa.kadusList = kadusList;
    setVersion((v) => v + 1);
  };

  return { data: profilDesa, updateHeroAndStats, updateVisiMisi, updatePerangkat, version };
}