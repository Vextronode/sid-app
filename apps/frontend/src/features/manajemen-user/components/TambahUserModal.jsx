// ==========================================
// TambahUserModal.jsx
// Popup form tambah user & role. Field "Wilayah" cuma muncul untuk
// role RT dan RW (kepala_desa & petugas_desa tidak perlu wilayah,
// sesuai catatan di desain).
// ==========================================

import { useState } from 'react';
import { Send } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'rt', label: 'RT' },
  { value: 'rw', label: 'RW' },
  { value: 'kadus', label: 'Kadus' },
  { value: 'petugas_desa', label: 'Petugas Desa' },
  { value: 'kepala_desa', label: 'Kepala Desa' },
];

// Role yang butuh input wilayah (RT/RW)
const ROLES_WITH_WILAYAH = ['rt', 'rw'];

export default function TambahUserModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({
    nama: '',
    email: '',
    role: '',
    wilayah: '',
    citizenId: '',
    password: '',
    status: 'aktif',
  });

  if (!open) return null;

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const showWilayah = ROLES_WITH_WILAYAH.includes(form.role);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
    setForm({ nama: '', email: '', role: '', wilayah: '', citizenId: '', password: '', status: 'aktif' });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-xl relative max-h-[90vh] overflow-y-auto"
      >
        <div className="flex flex-col gap-1 mb-4">
          <label className="text-sm font-medium text-gray-700">Nama lengkap *</label>
          <input
            required
            value={form.nama}
            onChange={handleChange('nama')}
            placeholder="Nama"
            className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
          />
        </div>

        <div className="flex flex-col gap-1 mb-4">
          <label className="text-sm font-medium text-gray-700">Email *</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            placeholder="Email"
            className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
          />
        </div>

        <div className="flex flex-col gap-1 mb-2">
          <label className="text-sm font-medium text-gray-700">Role *</label>
          <select
            required
            value={form.role}
            onChange={handleChange('role')}
            className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
          >
            <option value="">Pilih role</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <p className="text-xs text-gray-400 mb-4">
          Territory label hanya muncul untuk role RT dan RW (kepala_desa &amp; petugas_desa tidak perlu wilayah)
        </p>

        {/* Field wilayah cuma muncul kalau role yang dipilih RT atau RW */}
        {showWilayah && (
          <div className="flex flex-col gap-1 mb-4">
            <label className="text-sm font-medium text-gray-700">Wilayah (RT/RW)</label>
            <input
              value={form.wilayah}
              onChange={handleChange('wilayah')}
              placeholder="Misal: RT 001/RW 001"
              className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
            />
          </div>
        )}

        <div className="flex flex-col gap-1 mb-4">
          <label className="text-sm font-medium text-gray-700">Link ke warga (Citizen ID)</label>
          <input
            value={form.citizenId}
            onChange={handleChange('citizenId')}
            placeholder="ID dari table citzens"
            className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500 italic"
          />
        </div>

        <div className="flex flex-col gap-1 mb-4">
          <label className="text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={handleChange('password')}
            placeholder="Password"
            className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
          />
        </div>

        <div className="flex flex-col gap-1 mb-6">
          <label className="text-sm font-medium text-gray-700">Status akun</label>
          <select
            value={form.status}
            onChange={handleChange('status')}
            className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
          >
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
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