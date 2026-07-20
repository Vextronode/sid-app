/* eslint-disable react-hooks/set-state-in-effect */
// ==========================================
// BeritaFormModal.jsx
// Popup form Tambah/Edit Berita. Dipakai dua mode: tambah baru (initialData
// kosong) atau edit (initialData terisi dari berita yang dipilih).
// ==========================================

import { useState, useEffect } from 'react';
import { Send, Image as ImageIcon } from 'lucide-react';

export default function BeritaFormModal({ open, onClose, onSubmit, initialData }) {
  const [form, setForm] = useState({ judul: '', konten: '', thumbnail: null, status: 'draft' });

  // Isi ulang form waktu modal dibuka untuk edit, atau kosongkan untuk tambah baru
  useEffect(() => {
    if (initialData) {
      setForm({
        judul: initialData.judul ?? '',
        konten: initialData.konten ?? '',
        thumbnail: initialData.thumbnail ?? null,
        status: initialData.status ?? 'draft',
      });
    } else {
      setForm({ judul: '', konten: '', thumbnail: null, status: 'draft' });
    }
  }, [initialData, open]);

  if (!open) return null;

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleThumbnailChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setForm((prev) => ({ ...prev, thumbnail: file.name }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-xl relative max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-center font-medium text-gray-700 mb-6">
          {initialData ? 'Edit Berita' : 'Tambah / edit Berita'}
        </h2>

        <div className="flex flex-col gap-1 mb-4">
          <label className="text-sm font-medium text-gray-700">Judul *</label>
          <input
            required
            value={form.judul}
            onChange={handleChange('judul')}
            placeholder="Judul berita/Pengumuman"
            className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
          />
        </div>

        <div className="flex flex-col gap-1 mb-4">
          <label className="text-sm font-medium text-gray-700">Konten (rich text) *</label>
          <textarea
            required
            rows={5}
            value={form.konten}
            onChange={handleChange('konten')}
            placeholder="Tuliskan konten berita di sini..."
            className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500 resize-none"
          />
        </div>

        <div className="flex flex-col gap-1 mb-4">
          <label className="text-sm font-medium text-gray-700">Thumbnail (opsional)</label>
          <label className="border rounded-md px-3 py-8 flex flex-col items-center gap-2 text-gray-400 text-sm cursor-pointer hover:bg-gray-50">
            <ImageIcon size={20} />
            {form.thumbnail ? form.thumbnail : 'upload gambar'}
            <input type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
          </label>
        </div>

        <div className="flex flex-col gap-1 mb-6">
          <label className="text-sm font-medium text-gray-700">Status</label>
          <select
            value={form.status}
            onChange={handleChange('status')}
            className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
          >
            <option value="draft">Simpan sebagai draft</option>
            <option value="publikasi">Publikasikan</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-green-500 text-green-600 rounded-md py-2.5 text-sm font-medium hover:bg-green-50"
          >
            Batal
          </button>
          <button
            type="submit"
            className="flex-[2] bg-green-600 text-white rounded-md py-2.5 text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Send size={16} /> submit permohonan
          </button>
        </div>
      </form>
    </div>
  );
}