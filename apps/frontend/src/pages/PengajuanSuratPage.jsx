import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { SURAT_CONFIG } from "@/lib/constants/suratConfig";
import { DynamicSuratForm } from "@/features/surat/components/DynamicSuratForm";

export function PengajuanSuratPage() {
  const { kode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentConfig =
      SURAT_CONFIG[kode?.toUpperCase()] || SURAT_CONFIG.A04;
  const handleCancel = () => navigate("/info-surat");

  const handleSubmit = (data) => {
    const bulan = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Ags",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    const tgl = new Date();
    const formatTanggal = `${tgl.getDate()} ${bulan[tgl.getMonth()]} ${tgl.getFullYear()}`;

    // format data yang dibutuhin tabel DaftarSurat
    const suratBaru = {
      id: Date.now(),
      noSurat: "-",
      pemohon: user?.name || "Warga Desa",
      jenis: currentConfig.code || "SKD",
      tanggal: formatTanggal,
      status: "pending",

      nik: data.nik || null,
      alamat: data.alamat || null,
      keperluan: data.keperluan || null,
    };

    // Redirect ke halaman Daftar Surat sambil bawa surat yg tadi di input pas sebleum klik submit
    navigate("/daftar-surat");
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
