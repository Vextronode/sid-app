
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

export default function EditProfilWargaModal({
  open,
  onClose,
  onSaved,
  initialData,
}) {
  const [form, setForm] = useState({
    name: '',
    address: '',
    gender: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({
        name: initialData?.name ?? '',
        address: initialData?.address ?? '',
        gender: initialData?.gender ?? '',
      });
    }
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
      setError(
        err.response?.data?.message ??
          'Gagal menyimpan perubahan.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sid-modal-overlay">
      <form
        onSubmit={handleSubmit}
        className="sid-modal sid-edit-profil-warga-modal"
      >
        {/* ==========================================
            HEADER
        ========================================== */}

        <div className="sid-modal-header">
          <h2>Edit Profil</h2>
        </div>

        {/* ==========================================
            ERROR
        ========================================== */}

        {error && (
          <div className="sid-modal-error">
            {error}
          </div>
        )}

        {/* ==========================================
            NAMA
        ========================================== */}

        <div className="sid-modal-field sid-profile-field">
          <label>Full Name</label>

          <input
            value={form.name}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                name: e.target.value,
              }))
            }
            className="sid-input"
          />
        </div>

        {/* ==========================================
            ALAMAT
        ========================================== */}

        <div className="sid-modal-field sid-profile-field">
          <label>Alamat</label>

          <input
            value={form.address}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                address: e.target.value,
              }))
            }
            className="sid-input"
          />
        </div>

        {/* ==========================================
            GENDER
        ========================================== */}

        <div className="sid-modal-field sid-profile-gender-field">
          <label>Gender</label>

          <select
            value={form.gender}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                gender: e.target.value,
              }))
            }
            className="sid-select"
          >
            <option value="">Pilih</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </div>

        {/* ==========================================
            ACTION
        ========================================== */}

        <div className="sid-actions sid-modal-actions">
          <button
            type="button"
            onClick={onClose}
            className="sid-btn sid-btn-secondary"
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="sid-btn sid-btn-primary"
          >
            <Save size={14} />

            {isLoading
              ? 'Menyimpan...'
              : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
}

