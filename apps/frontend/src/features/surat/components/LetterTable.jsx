// ==========================================
// LetterTable.jsx
// Tabel daftar permohonan surat untuk pejabat (RT, RW, Kadus,
// Kades/Sekdes, Kasi/Kaur, Staf SIDUTama). Header dan sel memakai
// perataan yang sama: kolom teks rata kiri, kolom Aksi rata kanan.
// Di layar sempit setiap baris menjadi kartu (lihat surat-dokumen.css).
// Isi kolom Aksi ditentukan halaman lewat `renderActions` sesuai peran.
// ==========================================

import '@/styles/surat-dokumen.css'

import { StatusBadge } from '@/components/ui/StatusBadge'
import { OverdueBadge } from '@/components/ui/OverdueBadge'

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '-'
}

export function LetterTable({
  letters,
  loading = false,
  emptyMessage = 'Belum ada surat.',
  renderActions,
  label = 'Daftar permohonan surat',
}) {
  return (
    <div className="sid-letter-table-wrap">
      <table className="sid-letter-table" aria-label={label}>
        <thead>
          <tr>
            <th scope="col">No. Surat</th>
            <th scope="col">Pemohon</th>
            <th scope="col">Jenis</th>
            <th scope="col">Tanggal</th>
            <th scope="col">Status</th>
            <th scope="col" className="sid-letter-table-actions">
              Aksi
            </th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="sid-letter-table-message">
                Memuat data surat...
              </td>
            </tr>
          ) : letters.length === 0 ? (
            <tr>
              <td colSpan={6} className="sid-letter-table-message">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            letters.map((surat) => (
              <tr key={surat.id}>
                <td data-label="No. Surat" className="sid-letter-table-number">
                  <span>{surat.letter_number ? `#${surat.letter_number}` : '-'}</span>
                  {surat.revision_count > 0 && <small>Hasil revisi</small>}
                </td>

                <td data-label="Pemohon" className="sid-letter-table-applicant">
                  {surat.applicant_name ?? '-'}
                </td>

                <td data-label="Jenis">{surat.letter_type?.name ?? '-'}</td>

                <td data-label="Tanggal" className="sid-letter-table-date">
                  {formatDate(surat.submitted_at)}
                </td>

                <td data-label="Status">
                  <div className="sid-letter-table-status">
                    <StatusBadge status={surat.status} />
                    <OverdueBadge isOverdue={surat.is_overdue} />
                  </div>
                </td>

                <td data-label="Aksi" className="sid-letter-table-actions">
                  {renderActions(surat)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
