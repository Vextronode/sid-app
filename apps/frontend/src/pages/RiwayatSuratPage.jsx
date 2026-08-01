// ==========================================
// RiwayatSuratPage.jsx
// Tabel diganti SuratDateTracker: pilih tanggal, lihat tracking
// Submit->RT->RW->Kantor Desa, bisa geser antar surat di tanggal sama.
// ==========================================

import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { WargaLayout } from '@/components/layout/WargaLayout';
import { useLetters } from '@/features/surat/hooks/useLetters';
import SuratDateTracker from '@/features/warga-surat/components/SuratDateTracker';

export default function RiwayatSuratPage() {
  const navigate = useNavigate();
  const { letters, loading } = useLetters();

  return (
    <WargaLayout>
      <div className="px-4 py-5 max-w-3xl mx-auto">
        <button onClick={() => navigate('/jenis-surat')} className="flex items-center gap-1 text-sm text-green-600 mb-4 hover:underline">
          <ArrowLeft size={16} /> Kembali
        </button>

        <SuratDateTracker letters={letters} loading={loading} />
      </div>
    </WargaLayout>
  );
}