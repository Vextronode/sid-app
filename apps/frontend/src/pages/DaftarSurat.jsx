import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { WargaLayout } from "@/components/layout/WargaLayout";
import { DynamicSuratForm } from "@/features/surat/components/DynamicSuratForm";
import { useLetterTypes } from "@/features/surat/hooks/useLetterTypes";
import { getLetterTypeFormConfig } from "@/features/surat/utils/letterTypeConfig";
import { FileText, ChevronDown } from "lucide-react";

export function DaftarSurat() {
  const navigate = useNavigate();
  const [selectedCode, setSelectedCode] = useState("");
  const { letterTypes, loading, error } = useLetterTypes();

  const selectedLetterType = letterTypes.find((type) => type.code === selectedCode);
  const currentConfig = useMemo(() => getLetterTypeFormConfig(selectedLetterType), [selectedLetterType]);

  const handleCancel = () => setSelectedCode("");

  const handleSubmit = () => {
    // TODO: sambungkan ke endpoint submit surat asli
    navigate("/jenis-surat");
  };

  return (
    <WargaLayout>
      <div className="sid-page sid-daftar-surat-page">
        <div className="sid-daftar-surat-container">

          {/* ==========================================
              HEADER
              ========================================== */}

          <div className="sid-daftar-surat-header">
            <div className="sid-daftar-surat-header-icon">
              <FileText className="sid-daftar-surat-icon" />
            </div>

            <div className="sid-daftar-surat-header-content">
              <h1 className="sid-page-title">
                Form Pengajuan Surat
              </h1>

              <p className="sid-page-description">
                Pilih jenis surat yang ingin diajukan.
              </p>
            </div>
          </div>


          {/* ==========================================
              DROPDOWN PILIH SURAT
              ========================================== */}

          <div className="sid-card sid-daftar-surat-selector">

            <label className="sid-label">
              Jenis Surat
            </label>

            <div className="sid-daftar-surat-select-wrapper">

              <select
                value={selectedCode}
                disabled={loading || !!error}
                onChange={(e) =>
                  setSelectedCode(e.target.value)
                }
                className="sid-select sid-daftar-surat-select"
              >
                <option value="">
                  Pilih jenis surat...
                </option>

                {letterTypes.map((type) => (
                  <option
                    key={type.id}
                    value={type.code}
                  >
                    {type.name}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={18}
                className="sid-daftar-surat-select-icon"
              />

            </div>
            {loading && <p role="status">Memuat jenis surat...</p>}
            {error && <p role="alert">{error}</p>}
            {!loading && !error && selectedLetterType && !currentConfig && (
              <p role="alert">Formulir untuk jenis surat ini belum tersedia.</p>
            )}
          </div>


          {/* ==========================================
              FORM / EMPTY STATE
              ========================================== */}

          {currentConfig ? (
            <DynamicSuratForm
              config={currentConfig}
              letterTypes={letterTypes}
              onCancel={handleCancel}
              onSubmit={handleSubmit}
            />
          ) : !loading && !error && !selectedLetterType ? (
            <div className="sid-daftar-surat-empty">

              <FileText className="sid-daftar-surat-empty-icon" />

              <p className="sid-daftar-surat-empty-title">
                Belum ada jenis surat dipilih
              </p>

              <p className="sid-daftar-surat-empty-description">
                Pilih salah satu jenis surat di atas untuk
                mulai mengisi formulir.
              </p>

            </div>
          ) : null}

        </div>
      </div>
    </WargaLayout>
  );
}