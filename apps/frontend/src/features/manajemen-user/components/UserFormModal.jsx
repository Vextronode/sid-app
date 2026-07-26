/* eslint-disable react-hooks/set-state-in-effect */
// ==========================================
// UserFormModal.jsx
// Popup form Tambah/Edit user. Mode ditentukan dari initialData:
// - initialData null  -> mode Tambah (tombol "Tambah Pengguna")
// - initialData terisi -> mode Edit (tombol "Simpan Perubahan", field terisi)
// Field "Wilayah" cuma muncul untuk role RT/RW (kepala_desa & petugas_desa
// tidak perlu wilayah, sesuai catatan di desain).
// ==========================================

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, UserPlus } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'rt', label: 'RT' },
  { value: 'rw', label: 'RW' },
  { value: 'kadus', label: 'Kadus' },
  { value: 'kepala_desa', label: 'Kepala Desa' },
  { value: 'kasi_pelayanan', label: 'Kasi Pelayanan' },
  { value: 'kaur_tu_umum', label: 'Kaur TU Umum' },
  { value: 'petugas_desa', label: 'Petugas Desa' },
];

const ROLES_WITH_WILAYAH = ['rt', 'rw'];

const EMPTY_FORM = { name: '', email: '', role: '', citizen_id: '', password: '', is_active: true };

export default function UserFormModal({ open, onClose, onSubmit, initialData }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);

  const isEdit = !!initialData;

  useEffect(() => {
    if (open) {
      setForm(initialData ? { ...EMPTY_FORM, ...initialData, password: '' } : EMPTY_FORM);
    }
  }, [open, initialData]);

  if (!open) return null;

  const handleChange = (field) => (e) => {
    const value = field === 'is_active' ? e.target.value === 'aktif' : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const showWilayah = ROLES_WITH_WILAYAH.includes(form.role);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col gap-1 mb-4">
          <label className="text-sm font-medium text-gray-700">Nama lengkap *</label>
          <input
            required
            value={form.name}
            onChange={handleChange('name')}
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

        {showWilayah && (
          <div className="flex flex-col gap-1 mb-4">
            <label className="text-sm font-medium text-gray-700">Wilayah (RT/RW)</label>
            <input
              value={form.wilayah ?? ''}
              onChange={handleChange('wilayah')}
              placeholder="Misal: RT 001/RW 001"
              className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
            />
          </div>
        )}

        <div className="flex flex-col gap-1 mb-4">
          <label className="text-sm font-medium text-gray-700">Link ke warga (Citizen ID)</label>
          <input
            value={form.citizen_id}
            onChange={handleChange('citizen_id')}
            placeholder="ID dari table citizens"
            className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500 italic"
          />
        </div>

        <div className="flex flex-col gap-1 mb-4">
          <label className="text-sm font-medium text-gray-700">Password {isEdit && <span className="text-gray-400 font-normal">(kosongkan jika tidak diubah)</span>}</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={handleChange('password')}
              placeholder="Password"
              className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500 w-full pr-10"
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1 mb-6">
          <label className="text-sm font-medium text-gray-700">Status akun</label>
          <select
            value={form.is_active ? 'aktif' : 'nonaktif'}
            onChange={handleChange('is_active')}
            className="border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
          >
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 border border-green-500 text-green-600 rounded-md py-2.5 text-sm font-medium hover:bg-green-50">
            Batal
          </button>
          <button type="submit" className="flex-[2] bg-green-600 text-white rounded-md py-2.5 text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2">
            {isEdit ? (
              <>
                <Save size={16} /> Simpan Perubahan
              </>
            ) : (
              <>
                <UserPlus size={16} /> Tambah Pengguna
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}