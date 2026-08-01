/* eslint-disable no-unused-vars */
// ==========================================
// PengajuanSuratPage.jsx
// Dua mode:
// - DENGAN kode di URL (klik kartu jenis surat) -> langsung terisi,
//   dropdown jenis surat locked/tidak bisa diganti.
// - TANPA kode (klik "Ajukan Permohonan Baru") -> dropdown kosong,
//   form baru muncul setelah user pilih jenis surat.
// ==========================================

import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { SURAT_CONFIG } from "@/lib/constants/suratConfig";
import { DynamicSuratForm } from "@/features/surat/components/DynamicSuratForm";
import { WargaLayout } from "@/components/layout/WargaLayout";

export function PengajuanSuratPage() {
  const { kode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Kalau nggak ada kode di URL, mulai kosong (user harus pilih dulu)
  const [selectedCode, setSelectedCode] = useState(kode?.toUpperCase() ?? '');

  const currentConfig = selectedCode ? SURAT_CONFIG[selectedCode] : null;
  const isLocked = !!kode; // kalau dari URL langsung, dropdown dikunci

  const handleCancel = () => navigate("/jenis-surat");

  const handleSubmit = (data) => {
    const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    const tgl = new Date();
    const formatTanggal = `${tgl.getDate()} ${bulan[tgl.getMonth()]} ${tgl.getFullYear()}`;

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
      processed_at: data.processed_at || null,
    };

    navigate("/daftar-surat");
  };

  return (
    <WargaLayout>
      <div className="min-h-screen bg-gray-50/50 py-6 px-4 flex flex-col justify-between">
        <main className="max-w-3xl mx-auto w-full grow space-y-6">
          <div className="text-left">
            <h1 className="text-xl font-bold text-gray-800">Form Pengajuan Surat</h1>
            <p className="text-xs text-gray-400 mt-1">
              Lengkapi detail di bawah ini untuk mengajukan permohonan surat administrasi.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-sm font-semibold text-green-700 flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[10px] flex items-center justify-center">1</span>
              LANGKAH 1 – PILIH JENIS SURAT
            </p>

            <label className="text-xs text-gray-500">Jenis surat *</label>
            <select
              value={selectedCode}
              disabled={isLocked}
              onChange={(e) => setSelectedCode(e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500 mt-1 disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="">Pilih jenis surat...</option>
              {Object.values(SURAT_CONFIG).map((cfg) => (
                <option key={cfg.code} value={cfg.code}>{cfg.title}</option>
              ))}
            </select>

            {currentConfig && (
              <div className="bg-green-50 text-green-700 text-xs rounded-full px-3 py-2 mt-3 inline-block">
                Jenis ini: verifikasi <strong>document</strong> — wajib upload dokumen pendukung.
              </div>
            )}
          </div>

          {currentConfig ? (
            <DynamicSuratForm config={currentConfig} onCancel={handleCancel} onSubmit={handleSubmit} />
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 text-sm">
              Silakan pilih jenis surat di atas untuk melanjutkan.
            </div>
          )}
        </main>
      </div>
    </WargaLayout>
  );
}