/* eslint-disable react-hooks/set-state-in-effect */
// ==========================================
// EditInformasiUmumModal.jsx
// Form edit informasi umum desa (Nama Desa, Kecamatan, Kabupaten, dll).
// ==========================================

import { useState, useEffect } from "react";
import { Send } from "lucide-react";

export default function EditInformasiUmumModal({
  open,
  onClose,
  onSubmit,
  initialData,
}) {
  const [form, setForm] = useState(initialData);

  useEffect(() => {
    if (open) setForm(initialData);
  }, [open, initialData]);

  if (!open) return null;

  const handleChange = (field) => (e) =>
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const fields = [
    { key: "namaDesa", label: "Nama Desa" },
    { key: "kecamatan", label: "Kecamatan" },
    { key: "kabupaten", label: "Kabupaten" },
    { key: "kodeDesa", label: "Kode Desa" },
    { key: "kepalaDesa", label: "Kepala Desa" },
    { key: "alamat", label: "Alamat" },
    { key: "telepon", label: "Telepon" },
  ];

  return (
    <div className="sid-modal-overlay">
      <form
        onSubmit={handleSubmit}
        className="sid-modal-card sid-edit-info-modal"
      >
        <h2 className="sid-modal-title">
          Edit Informasi Umum
        </h2>

        <div className="sid-edit-info-fields">
          {fields.map((f) => (
            <div key={f.key} className="sid-form-group">
              <label className="sid-label">
                {f.label}
              </label>

              <input
                value={form[f.key] ?? ""}
                onChange={handleChange(f.key)}
                className="sid-input"
              />
            </div>
          ))}
        </div>

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
            className="sid-btn sid-btn-primary sid-modal-submit"
          >
            <Send size={16} />
            Simpan
          </button>
        </div>
      </form>
    </div>
  );
}