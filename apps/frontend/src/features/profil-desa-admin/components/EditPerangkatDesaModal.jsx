/* eslint-disable react-hooks/set-state-in-effect */
// ==========================================
// EditPerangkatDesaModal.jsx
// Form edit daftar perangkat desa (Kepala Desa, Sekretaris, Kaur, Kasi).
// ==========================================

import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';

export default function EditPerangkatDesaModal({ open, onClose, onSubmit, initialData }) {
  const [form, setForm] = useState(initialData);

  useEffect(() => {
    if (open) setForm(initialData);
  }, [open, initialData]);

  if (!open) return null;

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const fields = [
    { key: 'kepalaDesa', label: 'Kepala Desa' },
    { key: 'sekretarisDesa', label: 'Sekretaris Desa' },
    { key: 'kaurUmum', label: 'Kaur Umum' },
    { key: 'kaurKeuangan', label: 'Kaur Keuangan' },
    { key: 'kaurPerencanaan', label: 'Kaur Perencanaan' },
    { key: 'kasiPemerintahan', label: 'Kasi Pemerintahan' },
    { key: 'kasiPelayanan', label: 'Kasi Pelayanan' },
    { key: 'kasiKesejahteraan', label: 'Kasi Kesejahteraan' },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
        <h2 className="font-medium text-gray-800 mb-6">Edit Perangkat Desa</h2>

        {fields.map((f) => (
          <div key={f.key} className="flex flex-col gap-1 mb-4">
            <label className="text-sm font-medium text-gray-700">{f.label}</label>
            <input
              value={form[f.key] ?? ''}
              onChange={handleChange(f.key)}
              className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
            />
          </div>
        ))}

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