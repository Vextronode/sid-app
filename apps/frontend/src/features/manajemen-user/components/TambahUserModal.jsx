
// ==========================================
// TambahUserModal.jsx
// Popup form tambah user & role.
// Styling menggunakan SID Global Theme.
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

export default function TambahUserModal({
  open,
  onClose,
  onSubmit,
}) {
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

  const handleChange = (field) => (e) =>
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));

  const showWilayah = ROLES_WITH_WILAYAH.includes(form.role);

  const handleSubmit = (e) => {
    e.preventDefault();

    onSubmit(form);

    setForm({
      nama: '',
      email: '',
      role: '',
      wilayah: '',
      citizenId: '',
      password: '',
      status: 'aktif',
    });
  };

  return (
    <div className="sid-user-modal-overlay">
      <form
        onSubmit={handleSubmit}
        className="sid-user-modal"
      >
        {/* NAMA */}
        <div className="sid-user-form-group">
          <label className="sid-user-form-label">
            Nama lengkap *
          </label>

          <input
            required
            value={form.nama}
            onChange={handleChange('nama')}
            placeholder="Nama"
            className="sid-user-form-input"
          />
        </div>

        {/* EMAIL */}
        <div className="sid-user-form-group">
          <label className="sid-user-form-label">
            Email *
          </label>

          <input
            required
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            placeholder="Email"
            className="sid-user-form-input"
          />
        </div>

        {/* ROLE */}
        <div className="sid-user-form-group sid-user-form-group-role">
          <label className="sid-user-form-label">
            Role *
          </label>

          <select
            required
            value={form.role}
            onChange={handleChange('role')}
            className="sid-user-form-input"
          >
            <option value="">
              Pilih role
            </option>

            {ROLE_OPTIONS.map((r) => (
              <option
                key={r.value}
                value={r.value}
              >
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <p className="sid-user-form-helper">
          Territory label hanya muncul untuk role RT dan RW
          (kepala_desa &amp; petugas_desa tidak perlu wilayah)
        </p>

        {/* WILAYAH */}
        {showWilayah && (
          <div className="sid-user-form-group">
            <label className="sid-user-form-label">
              Wilayah (RT/RW)
            </label>

            <input
              value={form.wilayah}
              onChange={handleChange('wilayah')}
              placeholder="Misal: RT 001/RW 001"
              className="sid-user-form-input"
            />
          </div>
        )}

        {/* CITIZEN ID */}
        <div className="sid-user-form-group">
          <label className="sid-user-form-label">
            Link ke warga (Citizen ID)
          </label>

          <input
            value={form.citizenId}
            onChange={handleChange('citizenId')}
            placeholder="ID dari table citzens"
            className="sid-user-form-input sid-user-form-input-italic"
          />
        </div>

        {/* PASSWORD */}
        <div className="sid-user-form-group">
          <label className="sid-user-form-label">
            Password
          </label>

          <input
            type="password"
            value={form.password}
            onChange={handleChange('password')}
            placeholder="Password"
            className="sid-user-form-input"
          />
        </div>

        {/* STATUS */}
        <div className="sid-user-form-group sid-user-form-group-status">
          <label className="sid-user-form-label">
            Status akun
          </label>

          <select
            value={form.status}
            onChange={handleChange('status')}
            className="sid-user-form-input"
          >
            <option value="aktif">
              Aktif
            </option>

            <option value="nonaktif">
              Nonaktif
            </option>
          </select>
        </div>

        {/* ACTION */}
        <div className="sid-user-modal-actions">
          <button
            type="button"
            onClick={onClose}
            className="sid-user-modal-cancel"
          >
            Batal
          </button>

          <button
            type="submit"
            className="sid-user-modal-submit"
          >
            <Send size={16} />
            submit permohonan
          </button>
        </div>
      </form>
    </div>
  );
}
