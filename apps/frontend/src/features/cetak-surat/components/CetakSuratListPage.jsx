// ==========================================
// CetakSuratListPage.jsx
// Styling menggunakan SID Global CSS.
// ==========================================

import { useState } from 'react';
import { Search, Eye, Printer } from 'lucide-react';

import { useSuratSiapCetak } from '../hooks/useSuratSiapCetak';
import { generateSuratPDF } from '../utils/generateSuratPDF';

import StatusBadgeRT from '@/features/approval-rt/components/StatusBadgeRT';
import SuratInfoGridRT from '@/features/approval-rt/components/SuratInfoGridRT';
import ApprovalStepperRT from '@/features/approval-rt/components/ApprovalStepperRT';

export default function CetakSuratListPage({ title }) {
  const { data, setSearch } = useSuratSiapCetak();

  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState(null);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(keyword);
  };

  return (
    <div className="sid-cetak-surat-page">
      <div className="sid-cetak-surat-content">

        {/* ==========================================
            HEADER
        ========================================== */}

        <h2 className="sid-cetak-surat-title">
          {title}
        </h2>


        {/* ==========================================
            SEARCH
        ========================================== */}

        <form
          onSubmit={handleSearchSubmit}
          className="sid-cetak-surat-search"
        >
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Cari nama pemohon..."
            className="sid-cetak-surat-search-input"
          />

          <button
            type="submit"
            className="sid-cetak-surat-search-button"
            title="Cari"
          >
            <Search size={16} />
          </button>
        </form>


        {/* ==========================================
            TABLE
        ========================================== */}

        <div className="sid-cetak-surat-table-wrapper">
          <table className="sid-cetak-surat-table">
            <thead>
              <tr>
                <th>No.Surat</th>
                <th>Pemohon</th>
                <th>Jenis</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="sid-cetak-surat-empty"
                  >
                    Belum ada surat yang siap dicetak.
                  </td>
                </tr>
              ) : (
                data.map((surat) => (
                  <tr key={surat.id}>
                    <td>{surat.no_surat}</td>

                    <td>{surat.pemohon}</td>

                    <td>{surat.jenis}</td>

                    <td>
                      <StatusBadgeRT
                        status={surat.status}
                      />
                    </td>

                    <td>
                      <div className="sid-cetak-surat-actions">
                        <button
                          onClick={() => setSelected(surat)}
                          className="sid-cetak-surat-action sid-cetak-surat-action-view"
                          title="Lihat"
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          onClick={() => generateSuratPDF(surat)}
                          className="sid-cetak-surat-action sid-cetak-surat-action-print"
                          title="Cetak PDF"
                        >
                          <Printer size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>


        {/* ==========================================
            DETAIL MODAL
        ========================================== */}

        {selected && (
          <div className="sid-cetak-surat-modal-overlay">
            <div className="sid-cetak-surat-modal">

              <button
                onClick={() => setSelected(null)}
                className="sid-cetak-surat-modal-close"
                title="Tutup"
              >
                ✕
              </button>

              <h2 className="sid-cetak-surat-modal-title">
                Detail Surat
              </h2>

              <p className="sid-cetak-surat-modal-number">
                #{selected.no_surat}
              </p>

              <ApprovalStepperRT
                surat={selected}
              />

              <SuratInfoGridRT
                surat={selected}
              />

              <button
                onClick={() => generateSuratPDF(selected)}
                className="sid-cetak-surat-print-button"
              >
                <Printer size={16} />
                Cetak PDF
              </button>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}