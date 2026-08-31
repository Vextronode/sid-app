/* eslint-disable react-hooks/set-state-in-effect */
// ==========================================
// EditPerangkatDesaModal.jsx
// Form edit perangkat desa.
// Styling menggunakan SID Global Theme.
// ==========================================

import { useState, useEffect } from "react";
import { Send, Plus, X, Camera } from "lucide-react";

function PersonFields({ label, person, onChange }) {
  const handleFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      onChange({
        ...person,
        foto: reader.result,
      });
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="sid-person-card">
      <p className="sid-person-label">
        {label}
      </p>

      <div className="sid-person-content">
        <label className="sid-avatar-upload sid-avatar-upload-lg">
          {person.foto ? (
            <img
              src={person.foto}
              alt=""
              className="sid-avatar-image"
            />
          ) : (
            <Camera className="sid-avatar-icon" size={18} />
          )}

          <input
            type="file"
            accept="image/*"
            onChange={handleFoto}
            className="sid-file-hidden"
          />
        </label>

        <div className="sid-person-fields">
          <input
            value={person.nama}
            onChange={(e) =>
              onChange({
                ...person,
                nama: e.target.value,
              })
            }
            placeholder="Nama"
            className="sid-input"
          />

          <input
            value={person.jabatan}
            onChange={(e) =>
              onChange({
                ...person,
                jabatan: e.target.value,
              })
            }
            placeholder="Jabatan"
            className="sid-input"
          />
        </div>
      </div>
    </div>
  );
}

export default function EditPerangkatDesaModal({
  open,
  onClose,
  onSubmit,
  initialPerangkat,
  initialKadus,
}) {
  const [perangkat, setPerangkat] = useState({});
  const [kadusList, setKadusList] = useState([]);

  useEffect(() => {
    if (open) {
      setPerangkat(initialPerangkat);
      setKadusList(initialKadus.map((k) => ({ ...k })));
    }
  }, [open, initialPerangkat, initialKadus]);

  if (!open) return null;

  const updatePerson = (key) => (value) =>
    setPerangkat((prev) => ({
      ...prev,
      [key]: value,
    }));

  const handleKadusFoto = (id) => (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setKadusList((prev) =>
        prev.map((k) =>
          k.id === id
            ? {
                ...k,
                foto: reader.result,
              }
            : k
        )
      );
    };

    reader.readAsDataURL(file);
  };

  const handleKadusNama = (id, nama) =>
    setKadusList((prev) =>
      prev.map((k) =>
        k.id === id
          ? {
              ...k,
              nama,
            }
          : k
      )
    );

  const handleAddKadus = () =>
    setKadusList((prev) => [
      ...prev,
      {
        id: Date.now(),
        nama: "",
        foto: null,
      },
    ]);

  const handleRemoveKadus = (id) =>
    setKadusList((prev) =>
      prev.filter((k) => k.id !== id)
    );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(perangkat, kadusList);
  };

  return (
    <div className="sid-modal-overlay sid-modal-overlay-front">
      <form
        onSubmit={handleSubmit}
        className="sid-modal sid-modal-lg"
      >
        <div className="sid-modal-header">
          <div>
            <h2 className="sid-modal-title">
              Edit Perangkat Desa
            </h2>

            <p className="sid-modal-description">
              Perbarui informasi perangkat desa dan kepala dusun.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="sid-modal-close"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sid-modal-body">
          <PersonFields
            label="Kepala Desa"
            person={perangkat.kepalaDesa ?? {}}
            onChange={updatePerson("kepalaDesa")}
          />

          <PersonFields
            label="Sekretaris Desa"
            person={perangkat.sekretarisDesa ?? {}}
            onChange={updatePerson("sekretarisDesa")}
          />

          <PersonFields
            label="KAUR"
            person={perangkat.kaur ?? {}}
            onChange={updatePerson("kaur")}
          />

          <PersonFields
            label="KASI"
            person={perangkat.kasi ?? {}}
            onChange={updatePerson("kasi")}
          />

          <div className="sid-subsection">
            <p className="sid-subsection-title">
              Kepala Dusun (Kadus)
            </p>

            <div className="sid-kadus-list">
              {kadusList.map((k) => (
                <div
                  key={k.id}
                  className="sid-kadus-row"
                >
                  <label className="sid-avatar-upload sid-avatar-upload-sm">
                    {k.foto ? (
                      <img
                        src={k.foto}
                        alt=""
                        className="sid-avatar-image"
                      />
                    ) : (
                      <Camera
                        size={14}
                        className="sid-avatar-icon"
                      />
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleKadusFoto(k.id)}
                      className="sid-file-hidden"
                    />
                  </label>

                  <input
                    value={k.nama}
                    onChange={(e) =>
                      handleKadusNama(
                        k.id,
                        e.target.value
                      )
                    }
                    placeholder="Nama Kadus"
                    className="sid-input"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveKadus(k.id)
                    }
                    className="sid-remove-button"
                    aria-label="Hapus Kadus"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddKadus}
              className="sid-add-button"
            >
              <Plus size={14} />
              Tambah Kadus
            </button>
          </div>
        </div>

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