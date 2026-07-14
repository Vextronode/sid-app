import { useParams, useNavigate } from "react-router-dom";
import { SURAT_CONFIG } from "@/lib/constants/suratConfig";
import { DynamicSuratForm } from "@/features/surat/components/DynamicSuratForm";

export function PengajuanSuratPage() {
  const { kode } = useParams();
  const navigate = useNavigate();

  const currentConfig = SURAT_CONFIG[kode?.toUpperCase()] || SURAT_CONFIG.SKD;

  const handleCancel = () => navigate("/info-surat");

  const handleSubmit = (data) => {
    console.log("Form Disubmit! Payload data:", data);
    alert(`Sukses mengirim pengajuan ${currentConfig.title}!`);
    navigate("/info-surat");
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 flex flex-col justify-between">
      <main className="max-w-3xl mx-auto w-full grow space-y-6">
        <div className="text-left">
          <h1 className="text-xl font-bold text-gray-800">
            Ajukan permohonan {currentConfig.title}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Data pemohon diambil otomatis dari akun anda
          </p>
        </div>

        <DynamicSuratForm
          config={currentConfig}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      </main>
    </div>
  );
}
