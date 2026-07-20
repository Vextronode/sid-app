// ==========================================
// useProfilDesa.js
// State profil desa + fungsi update tiap section (mutasi langsung ke
// dummy object, nanti diganti call API PUT waktu backend siap).
// ==========================================

import { useState } from 'react';
import { profilDesa } from '../data/dummyProfilDesa';

export function useProfilDesa() {
  const [version, setVersion] = useState(0);

  const updateInformasiUmum = (data) => {
    Object.assign(profilDesa.informasiUmum, data);
    setVersion((v) => v + 1);
  };

  const updatePerangkatDesa = (data) => {
    Object.assign(profilDesa.perangkatDesa, data);
    setVersion((v) => v + 1);
  };

  const updateVisiMisi = (data) => {
    Object.assign(profilDesa.visiMisi, data);
    setVersion((v) => v + 1);
  };

  return { data: profilDesa, updateInformasiUmum, updatePerangkatDesa, updateVisiMisi, version };
}