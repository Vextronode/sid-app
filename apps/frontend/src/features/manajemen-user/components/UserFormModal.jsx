/* eslint-disable react-hooks/set-state-in-effect */
// ==========================================
// UserFormModal.jsx
// Popup form Tambah/Edit user.
// Styling mengikuti SID Global Theme.
// Logic dan behavior tidak diubah.
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

const EMPTY_FORM = {
  name: '',
  email: '',
  role: '',
  citizen_id: '',
  password: '',
  is_active: true,
};

export default function UserFormModal({
  open,
  onClose,
  onSubmit,
  initialData,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);

  const isEdit = !!initialData;

  useEffect(() => {
    if (open) {
      setForm(
        initialData
          ? { ...EMPTY_FORM, ...initialData, password: '' }
          : EMPTY_FORM
      );
    }
  }, [open, initialData]);

  if (!open) return null;

  const handleChange = (field) => (e) => {
    const value =
      field === 'is_active'
        ? e.target.value === 'aktif'
        : e.target.value;

    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const showWilayah = ROLES_WITH_WILAYAH.includes(form.role);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="sid-modal-overlay">
      <form
        onSubmit={handleSubmit}
        className="sid-modal sid-modal-user"
      >
        {/* Nama */}
        <div className="sid-form-group">
          <label className="sid-form-label">
            Nama lengkap *
          </label>

          <input
            required
            value={form.name}
            onChange={handleChange('name')}
            placeholder="Nama"
            className="sid-form-input"
          />
        </div>

        {/* Email */}
        <div className="sid-form-group">
          <label className="sid-form-label">
            Email *
          </label>

          <input
            required
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            placeholder="Email"
            className="sid-form-input"
          />
        </div>

        {/* Role */}
        <div className="sid-form-group sid-form-group-compact">
          <label className="sid-form-label">
            Role *
          </label>

          <select
            required
            value={form.role}
            onChange={handleChange('role')}
            className="sid-form-input sid-form-select"
          >
            <option value="">Pilih role</option>

            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <p className="sid-form-hint">
          Territory label hanya muncul untuk role RT dan RW
          (kepala_desa &amp; petugas_desa tidak perlu wilayah)
        </p>

        {/* Wilayah */}
        {showWilayah && (
          <div className="sid-form-group">
            <label className="sid-form-label">
              Wilayah (RT/RW)
            </label>

            <input
              value={form.wilayah ?? ''}
              onChange={handleChange('wilayah')}
              placeholder="Misal: RT 001/RW 001"
              className="sid-form-input"
            />
          </div>
        )}

        {/* Citizen ID */}
        <div className="sid-form-group">
          <label className="sid-form-label">
            Link ke warga (Citizen ID)
          </label>

          <input
            value={form.citizen_id}
            onChange={handleChange('citizen_id')}
            placeholder="ID dari table citizens"
            className="sid-form-input sid-form-input-italic"
          />
        </div>

        {/* Password */}
        <div className="sid-form-group">
          <label className="sid-form-label">
            Password{' '}
            {isEdit && (
              <span className="sid-form-label-muted">
                (kosongkan jika tidak diubah)
              </span>
            )}
          </label>

          <div className="sid-password-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={handleChange('password')}
              placeholder="Password"
              className="sid-form-input sid-form-password"
            />

            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="sid-password-toggle"
              aria-label={
                showPassword
                  ? 'Sembunyikan password'
                  : 'Tampilkan password'
              }
            >
              {showPassword ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} />
              )}
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="sid-form-group sid-form-group-last">
          <label className="sid-form-label">
            Status akun
          </label>

          <select
            value={form.is_active ? 'aktif' : 'nonaktif'}
            onChange={handleChange('is_active')}
            className="sid-form-input sid-form-select"
          >
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
        </div>

        {/* Action */}
        <div className="sid-modal-actions">
          <button
            type="button"
            onClick={onClose}
            className="sid-button sid-button-outline"
          >
            Batal
          </button>

          <button
            type="submit"
            className="sid-button sid-button-primary sid-button-submit"
          >
            {isEdit ? (
              <>
                <Save size={16} />
                Simpan Perubahan
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Tambah Pengguna
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}