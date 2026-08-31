
/* eslint-disable react-hooks/set-state-in-effect */
// ==========================================
// EditVisiMisiModal.jsx
// Form edit Visi & Misi. Misi berupa list dinamis — bisa tambah/hapus baris.
// Styling menggunakan SID Global Theme.
// ==========================================

import { useState, useEffect } from 'react';
import { Send, Plus, X } from 'lucide-react';

export default function EditVisiMisiModal({
  open,
  onClose,
  onSubmit,
  initialData,
}) {
  const [visi, setVisi] = useState('');
  const [misi, setMisi] = useState(['']);

  useEffect(() => {
    if (open) {
      setVisi(initialData.visi ?? '');
      setMisi(
        initialData.misi?.length
          ? [...initialData.misi]
          : ['']
      );
    }
  }, [open, initialData]);

  if (!open) return null;

  const handleMisiChange = (index, value) => {
    setMisi((prev) =>
      prev.map((m, i) =>
        i === index ? value : m
      )
    );
  };

  const handleAddMisi = () => {
    setMisi((prev) => [...prev, '']);
  };

  const handleRemoveMisi = (index) => {
    setMisi((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    onSubmit({
      visi,
      misi: misi.filter((m) => m.trim() !== ''),
    });
  };

  return (
    <div className="sid-modal-overlay">
      <form
        onSubmit={handleSubmit}
        className="sid-modal sid-edit-visi-misi-modal"
      >
        {/* HEADER */}
        <div className="sid-modal-header">
          <h2>Edit Visi &amp; Misi</h2>

          <p>
            Perbarui visi dan misi desa yang akan ditampilkan
            pada halaman profil.
          </p>
        </div>

        {/* VISI */}
        <div className="sid-modal-field sid-visi-field">
          <label>Visi</label>

          <textarea
            rows={3}
            value={visi}
            onChange={(e) => setVisi(e.target.value)}
            placeholder="Masukkan visi desa..."
            className="sid-textarea"
          />
        </div>

        {/* MISI */}
        <div className="sid-modal-field sid-misi-field">
          <label>Misi</label>

          <div className="sid-misi-list">
            {misi.map((item, index) => (
              <div
                key={index}
                className="sid-misi-item"
              >
                <div className="sid-misi-number">
                  {index + 1}
                </div>

                <input
                  value={item}
                  onChange={(e) =>
                    handleMisiChange(index, e.target.value)
                  }
                  placeholder={`Misi ke-${index + 1}`}
                  className="sid-input"
                />

                <button
                  type="button"
                  onClick={() => handleRemoveMisi(index)}
                  disabled={misi.length === 1}
                  className="sid-misi-remove"
                  title="Hapus misi"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddMisi}
            className="sid-misi-add"
          >
            <Plus size={15} />
            Tambah misi
          </button>
        </div>

        {/* ACTION */}
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
            className="sid-btn sid-btn-primary sid-btn-save"
          >
            <Send size={16} />
            Simpan
          </button>
        </div>
      </form>
    </div>
  );
}

