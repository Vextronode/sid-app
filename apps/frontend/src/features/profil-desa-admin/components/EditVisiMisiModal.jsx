/* eslint-disable react-hooks/set-state-in-effect */
// ==========================================
// EditVisiMisiModal.jsx
// Form edit Visi & Misi. Misi berupa list dinamis — bisa tambah/hapus baris.
// ==========================================

import { useState, useEffect } from 'react';
import { Send, Plus, X } from 'lucide-react';

export default function EditVisiMisiModal({ open, onClose, onSubmit, initialData }) {
  const [visi, setVisi] = useState('');
  const [misi, setMisi] = useState(['']);

  useEffect(() => {
    if (open) {
      setVisi(initialData.visi ?? '');
      setMisi(initialData.misi?.length ? [...initialData.misi] : ['']);
    }
  }, [open, initialData]);

  if (!open) return null;

  const handleMisiChange = (index, value) => {
    setMisi((prev) => prev.map((m, i) => (i === index ? value : m)));
  };

  const handleAddMisi = () => setMisi((prev) => [...prev, '']);
  const handleRemoveMisi = (index) => setMisi((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ visi, misi: misi.filter((m) => m.trim() !== '') });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
        <h2 className="font-medium text-gray-800 mb-6">Edit Visi &amp; Misi</h2>

        <div className="flex flex-col gap-1 mb-4">
          <label className="text-sm font-medium text-gray-700">Visi</label>
          <textarea
            rows={3}
            value={visi}
            onChange={(e) => setVisi(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500 resize-none"
          />
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <label className="text-sm font-medium text-gray-700">Misi</label>
          {misi.map((item, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={item}
                onChange={(e) => handleMisiChange(index, e.target.value)}
                placeholder={`Misi ke-${index + 1}`}
                className="flex-1 border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
              />
              <button
                type="button"
                onClick={() => handleRemoveMisi(index)}
                className="w-9 h-9 rounded-md border flex items-center justify-center text-red-500 hover:bg-red-50"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddMisi}
            className="self-start text-green-600 text-sm flex items-center gap-1 mt-1 hover:underline"
          >
            <Plus size={14} /> Tambah misi
          </button>
        </div>

        <div className="flex gap-3 mt-2">
          <button type="button" onClick={onClose} className="flex-1 border border-green-500 text-green-600 rounded-md py-2.5 text-sm font-medium hover:bg-green-50">
            Batal
          </button>
          <button type="submit" className="flex-[2] bg-green-600 text-white rounded-md py-2.5 text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2">
            <Send size={16} /> Simpan
          </button>
        </div>
      </form>
    </div>
  );
}