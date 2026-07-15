import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { FooterDesa } from "@/components/layout/FooterDesa";
import { TableSurat } from "@/features/surat/components/TableSurat";
import { FileText, Clock, CheckCircle2, Plus } from "lucide-react";

export function DaftarSurat() {
  const { user } = useAuth();
  const location = useLocation();
  const namaPemohon = user?.name || "Warga Desa";

  // DUmmy untuk table daftar surat
  const initialData = [
    {
      id: 1,
      noSurat: "-",
      pemohon: namaPemohon,
      jenis: "SKD",
      tanggal: "19 mei 2026",
      status: "rw_rejected",
    },
    {
      id: 2,
      noSurat: "-",
      pemohon: namaPemohon,
      jenis: "SKD",
      tanggal: "19 mei 2026",
      status: "rt_approved",
    },
  ];

  // Bikin state biar bisa ditambahin data baru
  const [dataRiwayat, setDataRiwayat] = useState(initialData);

  useEffect(() => {
    if (location.state && location.state.newSurat) {
      const suratBaru = location.state.newSurat;

      setTimeout(() => {
        setDataRiwayat((prev) => {
          const isExist = prev.find((item) => item.id === suratBaru.id);
          if (isExist) return prev;
          return [suratBaru, ...prev];
        });

        window.history.replaceState({}, document.title);
      }, 0);
    }
  }, [location.state]);

  // Hitung total ringkasan secara dinamis berdasarkan state dataRiwayat
  const totalPermohonan = dataRiwayat.length;
  const sedangDiproses = dataRiwayat.filter(
    (s) =>
      s.status.includes("pending") ||
      (s.status.includes("approved") && !s.status.includes("kades_approved")),
  ).length;
  const disetujuiFinal = dataRiwayat.filter(
    (s) => s.status === "kades_approved",
  ).length;

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-between">
      <main className="max-w-7xl mx-auto w-full px-4 md:px-8 py-10 grow space-y-10">
        {/* Header Section */}
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-gray-800">
              Dashboard Saya
            </h1>
            <p className="text-sm text-gray-400">
              Selamat Datang, {namaPemohon}
            </p>
          </div>

          {/* Stat Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Permohonan */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start">
              <div className="space-y-3">
                <p className="text-3xl font-medium text-gray-800">
                  {totalPermohonan}
                </p>
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">
                  Total Permohonan
                </p>
              </div>
              <FileText className="w-5 h-5 text-gray-300" />
            </div>

            {/* Sedang diproses */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start">
              <div className="space-y-3">
                <p className="text-3xl font-medium text-gray-800">
                  {sedangDiproses}
                </p>
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">
                  Sedang diproses
                </p>
              </div>
              <Clock className="w-5 h-5 text-gray-300" />
            </div>

            {/* Disetujui final */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start">
              <div className="space-y-3">
                <p className="text-3xl font-medium text-gray-800">
                  {disetujuiFinal}
                </p>
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">
                  Disetujui final
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-gray-300" />
            </div>
          </div>
        </div>

        {/* tabel */}
        <div className="space-y-4">
          <h2 className="text-md font-semibold text-gray-800">
            Surat Terbaru Saya
          </h2>

          {/* Throw state dataRiwayat ke komponen tabel */}
          <TableSurat data={dataRiwayat} />

          <div className="pt-4">
            <Link
              to="/info-surat"
              className="inline-flex items-center gap-2 bg-[#4CAF4F] hover:bg-[#439E46] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Ajukan Permohonan Baru
            </Link>
          </div>
        </div>
      </main>
      <FooterDesa />
    </div>
  );
}
