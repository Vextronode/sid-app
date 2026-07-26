/* eslint-disable react-hooks/set-state-in-effect */
// ==========================================
// EditProfilDesaModal.jsx
// Form edit hero (gambar, judul, deskripsi) + 3 statistik (Total
// Penduduk, Luas Wilayah, Jumlah Dusun). Upload gambar hero opsional,
// preview langsung pakai FileReader (base64), belum upload ke server.
// ==========================================

import { useState, useEffect } from 'react';
import { Send, Image as ImageIcon } from 'lucide-react';

export default function EditProfilDesaModal({ open, onClose, onSubmit, initialData }) {
  const [hero, setHero] = useState({ image: null, badge: '', title: '', description: '' });
  const [stats, setStats] = useState({ totalPenduduk: '', pendudukKeterangan: '', luasWilayah: '', luasKeterangan: '', jumlahDusun: '', dusunKeterangan: '' });

  useEffect(() => {
    if (open) {
      setHero(initialData.hero);
      setStats(initialData.stats);
    }
  }, [open, initialData]);

  if (!open) return null;

  const handleHeroChange = (field) => (e) => setHero((prev) => ({ ...prev, [field]: e.target.value }));
  const handleStatsChange = (field) => (e) => setStats((prev) => ({ ...prev, [field]: e.target.value }));

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setHero((prev) => ({ ...prev, image: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ hero, stats });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
        <h2 className="font-bold text-gray-800 text-lg mb-6">Edit Profil Desa</h2>

        <div className="flex flex-col gap-1 mb-4">
          <label className="text-sm font-medium text-gray-700">Gambar Hero (opsional)</label>
          <label className="border-2 border-dashed rounded-xl px-4 py-6 flex flex-col items-center gap-2 text-gray-400 text-sm cursor-pointer hover:bg-gray-50">
            {hero.image ? (
              <img src={hero.image} alt="preview" className="w-full h-32 object-cover rounded-lg" />
            ) : (
              <>
                <ImageIcon size={20} />
                <span>Klik untuk upload gambar</span>
              </>
            )}
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
        </div>

        <div className="flex flex-col gap-1 mb-4">
          <label className="text-sm font-medium text-gray-700">Badge Sambutan</label>
          <input value={hero.badge} onChange={handleHeroChange('badge')} className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500" />
        </div>

        <div className="flex flex-col gap-1 mb-4">
          <label className="text-sm font-medium text-gray-700">Judul Sambutan</label>
          <input value={hero.title} onChange={handleHeroChange('title')} className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500" />
        </div>

        <div className="flex flex-col gap-1 mb-6">
          <label className="text-sm font-medium text-gray-700">Deskripsi Desa</label>
          <textarea rows={4} value={hero.description} onChange={handleHeroChange('description')} className="border rounded-md p-3 text-sm outline-none focus:border-green-500 resize-none" />
        </div>

        <h3 className="text-sm font-semibold text-gray-700 mb-3">Statistik Desa</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Total Penduduk</label>
            <input type="number" value={stats.totalPenduduk} onChange={handleStatsChange('totalPenduduk')} className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Keterangan</label>
            <input value={stats.pendudukKeterangan} onChange={handleStatsChange('pendudukKeterangan')} placeholder="+2.4% Tahun ini" className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Luas Wilayah (ha)</label>
            <input type="number" step="0.1" value={stats.luasWilayah} onChange={handleStatsChange('luasWilayah')} className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Keterangan</label>
            <input value={stats.luasKeterangan} onChange={handleStatsChange('luasKeterangan')} placeholder="65% Lahan Produktif" className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Jumlah Dusun</label>
            <input type="number" value={stats.jumlahDusun} onChange={handleStatsChange('jumlahDusun')} className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Keterangan</label>
            <input value={stats.dusunKeterangan} onChange={handleStatsChange('dusunKeterangan')} placeholder="Tersebar di 24 RT / 08 RW" className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500" />
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <button type="button" onClick={onClose} className="flex-1 border border-green-500 text-green-600 rounded-md py-2.5 text-sm font-medium hover:bg-green-50">Batal</button>
          <button type="submit" className="flex-[2] bg-green-600 text-white rounded-md py-2.5 text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2">
            <Send size={16} /> Simpan
          </button>
        </div>
      </form>
    </div>
  );
}