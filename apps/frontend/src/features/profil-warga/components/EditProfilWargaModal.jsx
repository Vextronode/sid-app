/* eslint-disable react-hooks/set-state-in-effect */
// ==========================================
// EditProfilWargaModal.jsx
// Popup edit profil warga: nama, alamat, gender. NIK tidak bisa diubah
// (readonly, sudah terverifikasi).
// ⚠️ Endpoint update profil perlu disesuaikan (asumsi /api/profile, PUT).
// ==========================================

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import api from '@/lib/api';

export default function EditProfilWargaModal({ open, onClose, onSaved, initialData }) {
  const [form, setForm] = useState({ name: '', address: '', gender: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) setForm({ name: initialData?.name ?? '', address: initialData?.address ?? '', gender: initialData?.gender ?? '' });
  }, [open, initialData]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await api.put('/api/profile', form);
      onSaved(response.data.user ?? response.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Gagal menyimpan perubahan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
        <h2 className="font-bold text-gray-800 text-lg mb-4">Edit Profil</h2>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>}

        <div className="flex flex-col gap-1 mb-3">
          <label className="text-xs font-semibold text-gray-500">Full Name</label>
          <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500" />
        </div>

        <div className="flex flex-col gap-1 mb-3">
          <label className="text-xs font-semibold text-gray-500">Alamat</label>
          <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500" />
        </div>

        <div className="flex flex-col gap-1 mb-5">
          <label className="text-xs font-semibold text-gray-500">Gender</label>
          <select value={form.gender} onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500">
            <option value="">Pilih</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2.5 text-sm">Batal</button>
          <button type="submit" disabled={isLoading} className="flex-1 bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            <Save size={14} /> {isLoading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
}