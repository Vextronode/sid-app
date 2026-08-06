import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { WargaLayout } from '@/components/layout/WargaLayout';
import { SURAT_CONFIG } from '@/lib/constants/suratConfig';
import { DynamicSuratForm } from '@/features/surat/components/DynamicSuratForm';
import { FileText, ChevronDown } from "lucide-react";

export function DaftarSurat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCode, setSelectedCode] = useState('');

  const currentConfig = useMemo(() => (selectedCode ? SURAT_CONFIG[selectedCode] : null), [selectedCode]);

  const handleCancel = () => setSelectedCode('');

  const handleSubmit = (data) => {
    // TODO: sambungkan ke endpoint submit surat asli
    navigate('/jenis-surat');
  };

  return (
    <WargaLayout>
      {/* Penambahan 'relative z-0' di sini memastikan layer konten halaman tidak menimpa dropdown navbar */}
      <div className="relative z-0 min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Form Pengajuan Surat
                </h1>
                <p className="text-sm text-gray-500">
                  Pilih jenis surat yang ingin diajukan.
                </p>
              </div>
            </div>
          </div>

          {/* Dropdown Pilih Surat */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">

            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Jenis Surat
            </label>

            <div className="relative">
              <select
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
                className="
                  w-full
                  h-12
                  rounded-xl
                  border
                  border-green-600
                  bg-white
                  pl-4
                  pr-10
                  text-sm
                  text-gray-700
                  appearance-none
                  focus:outline-none
                  focus:ring-2
                  focus:ring-green-100
                  focus:border-green-500
                "
              >
                <option value="">Pilih jenis surat...</option>

                {Object.values(SURAT_CONFIG).map((cfg) => (
                  <option key={cfg.code} value={cfg.code}>
                    {cfg.title}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={18}
                className="
                  absolute
                  right-4
                  top-1/2
                  -translate-y-1/2
                  text-green-600
                  pointer-events-none
                "
              />
            </div>

          </div>

          {currentConfig ? (
            <DynamicSuratForm
              config={currentConfig}
              onCancel={handleCancel}
              onSubmit={handleSubmit}
            />
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-dashed border-gray-200 py-16 text-center">
              <FileText className="mx-auto w-10 h-10 text-gray-300 mb-3" />

              <p className="font-medium text-gray-600">
                Belum ada jenis surat dipilih
              </p>

              <p className="text-sm text-gray-400 mt-1">
                Pilih salah satu jenis surat di atas untuk mulai mengisi formulir.
              </p>
            </div>
          )}

        </div>
      </div>
    </WargaLayout>
  );
}