import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { WargaLayout } from "@/components/layout/WargaLayout";
import { SURAT_CONFIG } from "@/lib/constants/suratConfig";
import { DynamicSuratForm } from "@/features/surat/components/DynamicSuratForm";
import { FileText, ChevronDown } from "lucide-react";

export function DaftarSurat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCode, setSelectedCode] = useState("");

  const currentConfig = useMemo(
    () => (selectedCode ? SURAT_CONFIG[selectedCode] : null),
    [selectedCode]
  );

  const handleCancel = () => setSelectedCode("");

  const handleSubmit = (data) => {
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
                onChange={(e) =>
                  setSelectedCode(e.target.value)
                }
                className="sid-select sid-daftar-surat-select"
              >
                <option value="">
                  Pilih jenis surat...
                </option>

                {Object.values(SURAT_CONFIG).map((cfg) => (
                  <option
                    key={cfg.code}
                    value={cfg.code}
                  >
                    {cfg.title}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={18}
                className="sid-daftar-surat-select-icon"
              />

            </div>
          </div>


          {/* ==========================================
              FORM / EMPTY STATE
              ========================================== */}

          {currentConfig ? (
            <DynamicSuratForm
              config={currentConfig}
              onCancel={handleCancel}
              onSubmit={handleSubmit}
            />
          ) : (
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
          )}

        </div>
      </div>
    </WargaLayout>
  );
}