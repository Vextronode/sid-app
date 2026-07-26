/* eslint-disable react-hooks/set-state-in-effect */
// ==========================================
// EditPerangkatDesaModal.jsx
// Form edit 4 perangkat utama (Kepala Desa, Sekretaris, KAUR, KASI) —
// tiap orang: nama, jabatan (teks), foto (opsional, upload). Plus
// daftar Kadus dinamis — bisa tambah/hapus baris.
// ==========================================

import { useState, useEffect } from 'react';
import { Send, Plus, X, Camera } from 'lucide-react';

function PersonFields({ label, person, onChange }) {
  const handleFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ ...person, foto: reader.result });
    reader.readAsDataURL(file);
  };

  return (
    <div className="border rounded-xl p-4 mb-3">
      <p className="text-xs font-semibold text-gray-500 uppercase mb-3">{label}</p>
      <div className="flex gap-3 items-start">
        <label className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer relative">
          {person.foto ? <img src={person.foto} alt="" className="w-full h-full object-cover" /> : <Camera size={18} className="text-gray-400" />}
          <input type="file" accept="image/*" onChange={handleFoto} className="hidden" />
        </label>
        <div className="flex-1 flex flex-col gap-2">
          <input
            value={person.nama}
            onChange={(e) => onChange({ ...person, nama: e.target.value })}
            placeholder="Nama"
            className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
          />
          <input
            value={person.jabatan}
            onChange={(e) => onChange({ ...person, jabatan: e.target.value })}
            placeholder="Jabatan"
            className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
          />
        </div>
      </div>
    </div>
  );
}

export default function EditPerangkatDesaModal({ open, onClose, onSubmit, initialPerangkat, initialKadus }) {
  const [perangkat, setPerangkat] = useState({});
  const [kadusList, setKadusList] = useState([]);

  useEffect(() => {
    if (open) {
      setPerangkat(initialPerangkat);
      setKadusList(initialKadus.map((k) => ({ ...k })));
    }
  }, [open, initialPerangkat, initialKadus]);

  if (!open) return null;

  const updatePerson = (key) => (value) => setPerangkat((prev) => ({ ...prev, [key]: value }));

  const handleKadusFoto = (id) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setKadusList((prev) => prev.map((k) => (k.id === id ? { ...k, foto: reader.result } : k)));
    };
    reader.readAsDataURL(file);
  };

  const handleKadusNama = (id, nama) => setKadusList((prev) => prev.map((k) => (k.id === id ? { ...k, nama } : k)));
  const handleAddKadus = () => setKadusList((prev) => [...prev, { id: Date.now(), nama: '', foto: null }]);
  const handleRemoveKadus = (id) => setKadusList((prev) => prev.filter((k) => k.id !== id));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(perangkat, kadusList);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
        <h2 className="font-bold text-gray-800 text-lg mb-6">Edit Perangkat Desa</h2>

        <PersonFields label="Kepala Desa" person={perangkat.kepalaDesa ?? {}} onChange={updatePerson('kepalaDesa')} />
        <PersonFields label="Sekretaris Desa" person={perangkat.sekretarisDesa ?? {}} onChange={updatePerson('sekretarisDesa')} />
        <PersonFields label="KAUR" person={perangkat.kaur ?? {}} onChange={updatePerson('kaur')} />
        <PersonFields label="KASI" person={perangkat.kasi ?? {}} onChange={updatePerson('kasi')} />

        <p className="text-xs font-semibold text-gray-500 uppercase mt-6 mb-3">Kepala Dusun (Kadus)</p>
        <div className="flex flex-col gap-2 mb-3">
          {kadusList.map((k) => (
            <div key={k.id} className="flex items-center gap-2">
              <label className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer relative">
                {k.foto ? <img src={k.foto} alt="" className="w-full h-full object-cover" /> : <Camera size={14} className="text-gray-400" />}
                <input type="file" accept="image/*" onChange={handleKadusFoto(k.id)} className="hidden" />
              </label>
              <input
                value={k.nama}
                onChange={(e) => handleKadusNama(k.id, e.target.value)}
                placeholder="Nama Kadus"
                className="flex-1 border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
              />
              <button type="button" onClick={() => handleRemoveKadus(k.id)} className="w-9 h-9 rounded-md border flex items-center justify-center text-red-500 hover:bg-red-50">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={handleAddKadus} className="self-start text-green-600 text-sm flex items-center gap-1 mb-6 hover:underline">
          <Plus size={14} /> Tambah Kadus
        </button>

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 border border-green-500 text-green-600 rounded-md py-2.5 text-sm font-medium hover:bg-green-50">Batal</button>
          <button type="submit" className="flex-[2] bg-green-600 text-white rounded-md py-2.5 text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2">
            <Send size={16} /> Simpan
          </button>
        </div>
      </form>
    </div>
  );
}