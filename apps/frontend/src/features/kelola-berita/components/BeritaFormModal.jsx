
/* eslint-disable react-hooks/set-state-in-effect */

// ==========================================
// BeritaFormModal.jsx
// Popup form Tambah/Edit Berita.
// Styling menggunakan SID Global Theme.
// ==========================================

import { useState, useEffect } from 'react';
import { Send, Image as ImageIcon } from 'lucide-react';

const KATEGORI_OPTIONS = [
  'Umum',
  'Pencapaian Utama',
  'Community Update',
  'Infrastruktur',
  'Sejarah',
  'Pendidikan',
  'Lingkungan',
  'Budaya',
];

export default function BeritaFormModal({
  open,
  onClose,
  onSubmit,
  initialData,
}) {
  const [form, setForm] = useState({
    judul: '',
    kategori: 'Umum',
    konten: '',
    gambar: null,
    status: 'draft',
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        judul: initialData.judul ?? '',
        kategori: initialData.kategori ?? 'Umum',
        konten: initialData.konten ?? '',
        gambar: initialData.gambar ?? null,
        status: initialData.status ?? 'draft',
      });
    } else {
      setForm({
        judul: '',
        kategori: 'Umum',
        konten: '',
        gambar: null,
        status: 'draft',
      });
    }
  }, [initialData, open]);

  if (!open) return null;

  const handleChange = (field) => (e) =>
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));

  const handleGambarChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () =>
      setForm((prev) => ({
        ...prev,
        gambar: reader.result,
      }));

    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="sid-berita-modal-overlay">
      <form
        onSubmit={handleSubmit}
        className="sid-berita-modal"
      >
        {/* HEADER */}
        <h2 className="sid-berita-modal-title">
          {initialData ? 'Edit Berita' : 'Tambah Berita'}
        </h2>

        {/* JUDUL */}
        <div className="sid-berita-form-group">
          <label className="sid-berita-form-label">
            Judul *
          </label>

          <input
            required
            value={form.judul}
            onChange={handleChange('judul')}
            placeholder="Judul berita/Pengumuman"
            className="sid-berita-form-input"
          />
        </div>

        {/* KATEGORI */}
        <div className="sid-berita-form-group">
          <label className="sid-berita-form-label">
            Kategori
          </label>

          <select
            value={form.kategori}
            onChange={handleChange('kategori')}
            className="sid-berita-form-input"
          >
            {KATEGORI_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        {/* KONTEN */}
        <div className="sid-berita-form-group">
          <label className="sid-berita-form-label">
            Konten (rich text) *
          </label>

          <textarea
            required
            rows={5}
            value={form.konten}
            onChange={handleChange('konten')}
            placeholder="Tuliskan konten berita di sini..."
            className="sid-berita-form-textarea"
          />
        </div>

        {/* THUMBNAIL */}
        <div className="sid-berita-form-group">
          <label className="sid-berita-form-label">
            Thumbnail (opsional)
          </label>

          <label className="sid-berita-upload">
            {form.gambar ? (
              <img
                src={form.gambar}
                alt="preview"
                className="sid-berita-upload-preview"
              />
            ) : (
              <>
                <ImageIcon size={20} />
                <span>upload gambar</span>
              </>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={handleGambarChange}
              className="sid-berita-upload-input"
            />
          </label>
        </div>

        {/* STATUS */}
        <div className="sid-berita-form-group sid-berita-form-group-status">
          <label className="sid-berita-form-label">
            Status
          </label>

          <select
            value={form.status}
            onChange={handleChange('status')}
            className="sid-berita-form-input"
          >
            <option value="draft">
              Simpan sebagai draft
            </option>

            <option value="publikasi">
              Publikasikan
            </option>
          </select>
        </div>

        {/* ACTION */}
        <div className="sid-berita-modal-actions">
          <button
            type="button"
            onClick={onClose}
            className="sid-berita-modal-cancel"
          >
            Batal
          </button>

          <button
            type="submit"
            className="sid-berita-modal-submit"
          >
            <Send size={16} />

            {initialData
              ? 'Simpan Perubahan'
              : 'submit permohonan'}
          </button>
        </div>
      </form>
    </div>
  );
}

