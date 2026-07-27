// ==========================================
// JenisSuratPage.jsx
// Halaman "Pilih Jenis Surat" sesuai Image 2. Cuma 4 jenis yang aktif
// (sudah ada di SURAT_CONFIG: A04, A01, A05, A09), sisanya ditandai
// "Segera Hadir" karena belum ada konfigurasi fieldnya.
// Klik kartu jenis surat -> ke /pengajuan-surat/:kode (auto-fill).
// Klik "Ajukan Permohonan Baru" -> ke /pengajuan-surat (kosong, pilih dulu).
// ==========================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, MapPin, Store, Building2, CreditCard, HeartHandshake, Users, Church, Baby, Heart } from 'lucide-react';
import { SURAT_CONFIG } from '@/lib/constants/suratConfig';
import { WargaLayout } from '@/components/layout/WargaLayout';

// Daftar tampilan kartu, termasuk yang belum punya config (disabled).
// Kode yang ada di SURAT_CONFIG akan aktif & bisa diklik.
const JENIS_SURAT_DISPLAY = [
  { code: 'A04', shortLabel: 'SKD', label: 'Domisili', icon: MapPin, color: 'text-green-600 bg-green-50' },
  { code: 'A01', shortLabel: 'SKU', label: 'Usaha', icon: Store, color: 'text-yellow-600 bg-yellow-50' },
  { code: 'A02', shortLabel: 'SKTMR', label: 'Tidak Punya Rumah', icon: Building2, color: 'text-blue-600 bg-blue-50' },
  { code: 'A03', shortLabel: 'SKP', label: 'Penghasilan', icon: CreditCard, color: 'text-yellow-600 bg-yellow-50' },
  { code: 'A05', shortLabel: 'SKTM', label: 'Tidak Mampu', icon: HeartHandshake, color: 'text-green-600 bg-green-50' },
  { code: 'A06', shortLabel: 'SKBN', label: 'Beda Nama', icon: Users, color: 'text-blue-600 bg-blue-50' },
  { code: 'A07', shortLabel: 'SKP', label: 'Penguburan', icon: Church, color: 'text-green-600 bg-green-50' },
  { code: 'A08', shortLabel: 'SKTK', label: 'Kelahiran', icon: Baby, color: 'text-green-600 bg-green-50' },
  { code: 'A09', shortLabel: 'SkiBM', label: 'Belum Menikah', icon: Heart, color: 'text-blue-600 bg-blue-50' },
];

export default function JenisSuratPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = JENIS_SURAT_DISPLAY.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase()) || item.shortLabel.toLowerCase().includes(search.toLowerCase())
  );

  const handleCardClick = (code) => {
    if (SURAT_CONFIG[code]) {
      navigate(`/pengajuan-surat/${code}`);
    }
    // kalau belum ada config, kartu disabled, tidak melakukan apa-apa
  };

  return (
    <WargaLayout>
      <div className="px-4 py-5 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Pilih Jenis Surat</h1>
        <p className="text-sm text-gray-500 mb-4">Pilih jenis surat yang ingin Anda ajukan secara digital</p>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari Jenis Surat..."
            className="w-full border rounded-full pl-9 pr-3 py-2.5 text-sm outline-none focus:border-green-500 bg-white"
          />
        </div>

        <button
          onClick={() => navigate('/pengajuan-surat')}
          className="w-full bg-green-600 text-white rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-green-700 mb-5"
        >
          <Plus size={16} /> Ajukan Permohonan Baru
        </button>

        <div className="grid grid-cols-3 gap-3">
          {filtered.map((item) => {
            const Icon = item.icon;
            const isActive = !!SURAT_CONFIG[item.code];
            return (
              <button
                key={item.code}
                onClick={() => handleCardClick(item.code)}
                disabled={!isActive}
                className={`bg-white rounded-xl shadow-sm p-4 flex flex-col items-center text-center gap-2 border ${
                  isActive ? 'hover:shadow-md cursor-pointer' : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-700">{item.shortLabel}</p>
                  <p className="text-xs text-gray-600">{item.label}</p>
                  {!isActive && <p className="text-[9px] text-gray-400 mt-0.5">Segera Hadir</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </WargaLayout>
  );
}