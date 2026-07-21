// ==========================================
// AjukanSuratPage.jsx
// Form pengajuan surat Warga, 2 langkah:
// LANGKAH 1 — pilih jenis surat (dropdown), field spesifik ikut berubah
// otomatis sesuai jenis yang dipilih.
// LANGKAH 2 — isi form: field umum (Nama/NIK/Alamat/RT-RW otomatis dari
// akun), field spesifik jenis surat, upload dokumen, catatan tambahan.
// ==========================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Send, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAjukanSurat } from '@/features/warga-surat/hooks/useAjukanSurat';
import { SURAT_TYPES } from '@/features/warga-surat/constants/suratTypes';
import DynamicField from '@/features/warga-surat/components/DynamicField';

export default function AjukanSuratPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { ajukan, isSubmitting } = useAjukanSurat({ userId: user?.id });

  const [jenisSurat, setJenisSurat] = useState('SKD');
  const [detail, setDetail] = useState({});
  const [dokumen, setDokumen] = useState(null);
  const [catatan, setCatatan] = useState('');

  const selectedType = useMemo(() => SURAT_TYPES.find((s) => s.value === jenisSurat), [jenisSurat]);

  const handleJenisChange = (e) => {
    setJenisSurat(e.target.value);
    setDetail({}); // reset field spesifik waktu ganti jenis surat
  };

  const handleDetailChange = (key) => (value) => {
    setDetail((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setDokumen(file.name);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    ajukan({
      jenis: selectedType.value,
      jenisLabel: `${selectedType.value} — ${selectedType.label}`,
      detail,
      dokumenNama: dokumen,
      catatan,
      user,
    });
    navigate('/riwayat-surat');
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-lg font-medium text-gray-800">
        Ajukan permohonan Surat {selectedType.label.replace('Surat Keterangan ', '')}
      </h1>
      <p className="text-sm text-gray-400 mb-6">Data pemohon diambil otomatis dari akun anda (UC-03)</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6">
        {/* LANGKAH 1 */}
        <h2 className="text-sm font-semibold text-gray-700 mb-3">LANGKAH 1 – PILIH JENIS SURAT</h2>
        <div className="flex flex-col gap-1 mb-2">
          <label className="text-xs text-gray-500">
            Jenis surat <span className="text-red-500">*</span>
          </label>
          <select
            value={jenisSurat}
            onChange={handleJenisChange}
            className="border border-green-500 text-green-600 rounded-md px-3 py-2 text-sm outline-none"
          >
            {SURAT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-full px-3 py-2 mb-6 flex items-center gap-2">
          <CheckCircle2 size={14} />
          <span>Jenis ini: verifikasi <strong>document</strong> — wajib upload dokumen pendukung.</span>
        </div>

        {/* LANGKAH 2 */}
        <h2 className="text-sm font-semibold text-gray-700 mb-3">LANGKAH 2 – ISI FORM</h2>

        {/* Field umum, otomatis dari akun, read-only */}
        <div className="flex flex-col gap-1 mb-4">
          <label className="text-xs text-gray-500">Nama Pemohon (otomatis)</label>
          <input readOnly value={user?.nama ?? 'Budi Santoso'} className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500" />
        </div>
        <div className="flex flex-col gap-1 mb-4">
          <label className="text-xs text-gray-500">NIK (otomatis)</label>
          <input readOnly value={user?.nik ?? '****-****-0042'} className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500" />
        </div>
        <div className="flex flex-col gap-1 mb-4">
          <label className="text-xs text-gray-500">Alamat (otomatis)</label>
          <input readOnly value={user?.alamat ?? 'Alamat'} className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500" />
        </div>
        <div className="flex flex-col gap-1 mb-4">
          <label className="text-xs text-gray-500">RT/RW (otomatis)</label>
          <input readOnly value={user?.wilayah_kode ?? '000/000'} className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500" />
        </div>

        {/* Field spesifik sesuai jenis surat yang dipilih */}
        {selectedType.fields.map((field) => (
          <DynamicField
            key={field.key}
            field={field}
            value={detail[field.key] ?? ''}
            onChange={handleDetailChange(field.key)}
          />
        ))}

        {/* Upload dokumen pendukung */}
        <div className="flex flex-col gap-1 mb-4">
          <label className="text-xs text-gray-500">Uplod Dokumen Pendukung</label>
          <label className="border-2 border-dashed rounded-lg px-4 py-10 flex flex-col items-center gap-2 text-gray-400 text-sm cursor-pointer hover:bg-gray-50">
            <Upload size={22} />
            <span className="font-medium text-gray-500">
              {dokumen ? dokumen : 'Klik untuk upload atau drag & drop'}
            </span>
            <span className="text-xs">PDF, JPG, PNG – maks. 5MB</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" />
          </label>
        </div>

        {/* Catatan tambahan, opsional */}
        <div className="flex flex-col gap-1 mb-6">
          <label className="text-xs text-gray-500">Catatan Tambahan</label>
          <textarea
            rows={2}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Opsional"
            className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 border border-green-500 text-green-600 rounded-md py-2.5 text-sm font-medium hover:bg-green-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-[2] bg-green-600 text-white rounded-md py-2.5 text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send size={16} /> submit permohonan
          </button>
        </div>
      </form>
    </div>
  );
}