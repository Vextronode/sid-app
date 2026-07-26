// ==========================================
// RiwayatVerifikasiTable.jsx
// Tabel riwayat surat di dashboard Operator Desa. Kolom Aksi berupa
// menu titik-tiga: opsi "Print" hanya aktif kalau surat sudah rw_approved
// (sudah disetujui RT & RW), selain itu disabled/abu-abu.
// ==========================================

import { useState } from 'react';
import { MoreVertical, Printer, Eye } from 'lucide-react';
import { previewSuratPDF } from '@/features/cetak-surat/utils/generateSuratPDF';

const STATUS_LABEL = {
  pending: { label: 'PENDING', className: 'bg-blue-50 text-blue-600' },
  rt_approved: { label: 'PROSES', className: 'bg-yellow-50 text-yellow-700' },
  rt_rejected: { label: 'DITOLAK', className: 'bg-red-50 text-red-600' },
  rw_approved: { label: 'VERIFIED', className: 'bg-green-50 text-green-700' },
  rw_rejected: { label: 'DITOLAK', className: 'bg-red-50 text-red-600' },
};

export default function RiwayatVerifikasiTable({ data }) {
  const [openMenuId, setOpenMenuId] = useState(null);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 text-lg">Riwayat Verifikasi</h3>
        <button className="text-sm text-green-600 flex items-center gap-1 hover:underline">Lihat Semua →</button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-400 text-xs">
            <th className="py-2 font-medium">Nama Resident</th>
            <th className="py-2 font-medium">Tipe Surat</th>
            <th className="py-2 font-medium">Waktu Pengajuan</th>
            <th className="py-2 font-medium">Status</th>
            <th className="py-2 font-medium text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={5} className="text-center text-gray-400 py-8">Belum ada data.</td></tr>
          ) : (
            data.map((surat) => {
              // Surat cuma bisa di-print kalau sudah lolos RT & RW
              const bisaCetak = surat.status === 'rw_approved';
              const badge = STATUS_LABEL[surat.status] ?? { label: surat.status, className: 'bg-gray-50 text-gray-500' };

              return (
                <tr key={surat.id} className="border-b last:border-0">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-semibold">
                        {(surat.applicant_name ?? '?').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="font-medium text-gray-800">{surat.applicant_name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-gray-600">{surat.letter_type?.name ?? '-'}</td>
                  <td className="py-3 text-gray-500">{surat.submitted_at ? new Date(surat.submitted_at).toLocaleString('id-ID') : '-'}</td>
                  <td className="py-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${badge.className}`}>{badge.label}</span>
                  </td>
                  <td className="py-3 text-right relative">
                    <button onClick={() => setOpenMenuId(openMenuId === surat.id ? null : surat.id)} className="text-gray-400 hover:text-gray-600 p-1">
                      <MoreVertical size={16} />
                    </button>

                    {openMenuId === surat.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-0 top-8 bg-white shadow-lg rounded-lg border z-20 w-40 py-1 text-left">
                          <button
                            onClick={() => { setOpenMenuId(null); /* TODO: buka modal detail */ }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            <Eye size={14} /> Lihat Detail
                          </button>
                          <button
                            disabled={!bisaCetak}
                            onClick={() => { if (bisaCetak) { previewSuratPDF(surat); setOpenMenuId(null); } }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${
                              bisaCetak ? 'text-gray-600 hover:bg-gray-50' : 'text-gray-300 cursor-not-allowed'
                            }`}
                            title={!bisaCetak ? 'Surat belum disetujui RT & RW' : ''}
                          >
                            <Printer size={14} /> Print Surat
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}