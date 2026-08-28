// ==========================================
// JenisSuratPage.jsx
// ==========================================

import { useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  XCircle,
  ListChecks,
} from 'lucide-react';

import { WargaLayout } from '@/components/layout/WargaLayout';
import { useLetters } from '@/features/surat/hooks/useLetters';
import SuratDateTracker from '@/features/warga-surat/components/SuratDateTracker';

export default function JenisSuratPage() {
  const navigate = useNavigate();
  const { letters, loading } = useLetters();

  const total = letters.length;

  const disetujui = letters.filter(
    (s) => s.status === 'kasi_approved'
  ).length;

  const ditolak = letters.filter(
    (s) => s.status?.endsWith('_rejected')
  ).length;

  const menunggu = letters.filter(
    (s) =>
      !s.status?.endsWith('_rejected') &&
      s.status !== 'kasi_approved'
  ).length;

  return (
    <WargaLayout>
      <div className="sid-page sid-surat-page">

        {/* ==========================================
            HEADER
            ========================================== */}

        <div className="sid-surat-header">
          <h1 className="sid-page-title">
            Surat Saya
          </h1>

          <p className="sid-page-description">
            Pantau semua permohonan surat yang pernah Anda ajukan.
          </p>
        </div>


        {/* ==========================================
            STAT CARD
            ========================================== */}

        <div className="sid-surat-stat-grid">

          {/* TOTAL */}

          <button
            type="button"
            onClick={() => navigate('/daftar-surat-saya')}
            className="sid-surat-stat-card"
          >
            <div className="sid-surat-stat-content">
              <p className="sid-surat-stat-label">
                Total Pengajuan
              </p>

              <p className="sid-surat-stat-number">
                {loading ? '-' : total}
              </p>
            </div>

            <div className="sid-surat-stat-icon sid-surat-stat-icon-total">
              <FileText size={20} />
            </div>
          </button>


          {/* DISETUJUI */}

          <button
            type="button"
            onClick={() =>
              navigate('/daftar-surat-saya?status=approved')
            }
            className="sid-surat-stat-card"
          >
            <div className="sid-surat-stat-content">
              <p className="sid-surat-stat-label">
                Permohonan Disetujui
              </p>

              <p className="sid-surat-stat-number sid-surat-stat-number-approved">
                {loading ? '-' : disetujui}
              </p>
            </div>

            <div className="sid-surat-stat-icon sid-surat-stat-icon-approved">
              <CheckCircle2 size={20} />
            </div>
          </button>


          {/* DITOLAK */}

          <button
            type="button"
            onClick={() =>
              navigate('/daftar-surat-saya?status=ditolak')
            }
            className="sid-surat-stat-card"
          >
            <div className="sid-surat-stat-content">
              <p className="sid-surat-stat-label">
                Permohonan Ditolak
              </p>

              <p className="sid-surat-stat-number sid-surat-stat-number-rejected">
                {loading ? '-' : ditolak}
              </p>
            </div>

            <div className="sid-surat-stat-icon sid-surat-stat-icon-rejected">
              <XCircle size={20} />
            </div>
          </button>


          {/* SEDANG DIPROSES */}

          <div className="sid-surat-stat-card sid-surat-stat-card-processing">

            <div className="sid-surat-stat-content">
              <p className="sid-surat-stat-label">
                Sedang Diproses
              </p>

              <p className="sid-surat-stat-number">
                {loading ? '-' : menunggu}
              </p>
            </div>

            <div className="sid-surat-stat-icon sid-surat-stat-icon-processing">
              <ListChecks size={20} />
            </div>

          </div>

        </div>


        {/* ==========================================
            TRACKER
            ========================================== */}

        <SuratDateTracker
          letters={letters}
          loading={loading}
        />

      </div>
    </WargaLayout>
  );
}