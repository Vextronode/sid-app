// ==========================================
// DaftarSurat.jsx (Beranda Warga)
// Sekarang jadi halaman Ajukan Surat langsung: dropdown pilih jenis
// surat, begitu dipilih baru muncul form dinamis di bawahnya.
// Sesuai desain: judul besar, subjudul abu-abu, card "LANGKAH 1"
// dengan lingkaran hijau nomor 1, lalu card placeholder/form di bawah.
// ==========================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { WargaLayout } from '@/components/layout/WargaLayout';
import { SURAT_CONFIG } from '@/lib/constants/suratConfig';
import { DynamicSuratForm } from '@/features/surat/components/DynamicSuratForm';

export function DaftarSurat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCode, setSelectedCode] = useState('');

  const currentConfig = useMemo(() => (selectedCode ? SURAT_CONFIG[selectedCode] : null), [selectedCode]);

  const handleCancel = () => setSelectedCode('');

  const handleSubmit = (data) => {
    // TODO: sambungkan ke endpoint submit surat asli
    console.log('Submit surat', { jenis: currentConfig?.code, data, pemohon: user?.name });
    navigate('/jenis-surat');
  };

  return (
    <WargaLayout>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Form Pengajuan Surat</h1>
          <p className="text-sm text-gray-400 mb-6">
            Lengkapi detail di bawah ini untuk mengajukan permohonan surat administrasi.
          </p>

          {/* Card Langkah 1 - Pilih Jenis Surat */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <h2 className="text-sm font-bold text-green-700 uppercase tracking-wide">
                Langkah 1 – Pilih Jenis Surat
              </h2>
            </div>

            <label className="text-sm text-gray-600 block mb-1">
              Jenis surat <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className="w-full border rounded-lg px-4 py-3 text-base outline-none focus:border-green-500"
            >
              <option value="">Pilih jenis surat...</option>
              {Object.values(SURAT_CONFIG).map((cfg) => (
                <option key={cfg.code} value={cfg.code}>{cfg.title}</option>
              ))}
            </select>
          </div>

          {/* Card Langkah 2 - Form / Placeholder */}
          {currentConfig ? (
            <DynamicSuratForm config={currentConfig} onCancel={handleCancel} onSubmit={handleSubmit} />
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
              <p className="text-gray-400 text-base">
                Silakan pilih jenis surat di atas untuk melanjutkan.
              </p>
            </div>
          )}
        </div>
      </div>
    </WargaLayout>
  );
}