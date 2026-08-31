/* eslint-disable react-hooks/set-state-in-effect */
// ==========================================
// EditProfilDesaModal.jsx
// Form edit profil desa.
// Styling menggunakan SID Global Theme.
// ==========================================

import { useState, useEffect } from "react";
import { Send, Image as ImageIcon } from "lucide-react";

export default function EditProfilDesaModal({
  open,
  onClose,
  onSubmit,
  initialData,
}) {
  const [hero, setHero] = useState({
    image: null,
    badge: "",
    title: "",
    description: "",
  });

  const [stats, setStats] = useState({
    totalPenduduk: "",
    pendudukKeterangan: "",
    luasWilayah: "",
    luasKeterangan: "",
    jumlahDusun: "",
    dusunKeterangan: "",
  });

  useEffect(() => {
    if (open) {
      setHero(initialData.hero);
      setStats(initialData.stats);
    }
  }, [open, initialData]);

  if (!open) return null;

  const handleHeroChange = (field) => (e) =>
    setHero((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));

  const handleStatsChange = (field) => (e) =>
    setStats((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () =>
      setHero((prev) => ({
        ...prev,
        image: reader.result,
      }));

    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ hero, stats });
  };

  return (
    <div className="sid-modal-overlay sid-modal-overlay-front">
      <form
        onSubmit={handleSubmit}
        className="sid-modal sid-modal-lg"
      >
        {/* HEADER */}
        <div className="sid-modal-header">
          <div>
            <h2 className="sid-modal-title">
              Edit Profil Desa
            </h2>

            <p className="sid-modal-description">
              Perbarui informasi profil dan statistik desa.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="sid-modal-close"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        <div className="sid-modal-body">
          {/* =========================
              HERO
              ========================= */}

          <div className="sid-form-group">
            <label className="sid-label sid-form-label">
              Gambar Hero (opsional)
            </label>

            <label className="sid-image-upload">
              {hero.image ? (
                <img
                  src={hero.image}
                  alt="preview"
                  className="sid-image-preview"
                />
              ) : (
                <>
                  <ImageIcon
                    size={22}
                    className="sid-image-upload-icon"
                  />

                  <span className="sid-image-upload-title">
                    Klik untuk upload gambar
                  </span>

                  <span className="sid-image-upload-description">
                    Format gambar JPG, PNG, atau WEBP
                  </span>
                </>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="sid-file-hidden"
              />
            </label>
          </div>

          <div className="sid-form-group">
            <label className="sid-label sid-form-label">
              Badge Sambutan
            </label>

            <input
              value={hero.badge}
              onChange={handleHeroChange("badge")}
              className="sid-input"
            />
          </div>

          <div className="sid-form-group">
            <label className="sid-label sid-form-label">
              Judul Sambutan
            </label>

            <input
              value={hero.title}
              onChange={handleHeroChange("title")}
              className="sid-input"
            />
          </div>

          <div className="sid-form-group sid-form-group-last">
            <label className="sid-label sid-form-label">
              Deskripsi Desa
            </label>

            <textarea
              rows={4}
              value={hero.description}
              onChange={handleHeroChange("description")}
              className="sid-textarea"
            />
          </div>

          {/* =========================
              STATISTIK DESA
              ========================= */}

          <div className="sid-form-section">
            <h3 className="sid-section-title">
              Statistik Desa
            </h3>

            <div className="sid-stat-form-grid">
              <div className="sid-form-group">
                <label className="sid-label">
                  Total Penduduk
                </label>

                <input
                  type="number"
                  value={stats.totalPenduduk}
                  onChange={handleStatsChange("totalPenduduk")}
                  className="sid-input"
                />
              </div>

              <div className="sid-form-group">
                <label className="sid-label">
                  Keterangan
                </label>

                <input
                  value={stats.pendudukKeterangan}
                  onChange={handleStatsChange(
                    "pendudukKeterangan"
                  )}
                  placeholder="+2.4% Tahun ini"
                  className="sid-input"
                />
              </div>

              <div className="sid-form-group">
                <label className="sid-label">
                  Luas Wilayah (ha)
                </label>

                <input
                  type="number"
                  step="0.1"
                  value={stats.luasWilayah}
                  onChange={handleStatsChange("luasWilayah")}
                  className="sid-input"
                />
              </div>

              <div className="sid-form-group">
                <label className="sid-label">
                  Keterangan
                </label>

                <input
                  value={stats.luasKeterangan}
                  onChange={handleStatsChange(
                    "luasKeterangan"
                  )}
                  placeholder="65% Lahan Produktif"
                  className="sid-input"
                />
              </div>

              <div className="sid-form-group">
                <label className="sid-label">
                  Jumlah Dusun
                </label>

                <input
                  type="number"
                  value={stats.jumlahDusun}
                  onChange={handleStatsChange("jumlahDusun")}
                  className="sid-input"
                />
              </div>

              <div className="sid-form-group">
                <label className="sid-label">
                  Keterangan
                </label>

                <input
                  value={stats.dusunKeterangan}
                  onChange={handleStatsChange(
                    "dusunKeterangan"
                  )}
                  placeholder="Tersebar di 24 RT / 08 RW"
                  className="sid-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="sid-modal-footer">
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