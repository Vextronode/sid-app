// ==========================================
// SuratTable.jsx
// Tabel daftar surat: No.Surat, Pemohon, Jenis, Tanggal, Status, Aksi.
// Dipakai di semua tab (semua/pending/rejected/approved) untuk role RT & RW.
// ==========================================

import StatusBadge from './StatusBadge';

export default function SuratTable({ data, onView, onEdit, onDelete }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-gray-500">
          <th className="py-3 px-2 font-medium">No.Surat</th>
          <th className="py-3 px-2 font-medium">Pemohon</th>
          <th className="py-3 px-2 font-medium">Jenis</th>
          <th className="py-3 px-2 font-medium">Tanggal</th>
          <th className="py-3 px-2 font-medium">Status</th>
          <th className="py-3 px-2 font-medium">Aksi</th>
        </tr>
      </thead>
      <tbody>
        {/* Kalau data kosong, tampilkan pesan empty state daripada tabel kosong melompong */}
        {data.length === 0 ? (
          <tr>
            <td colSpan={6} className="text-center text-gray-400 py-8">
              Belum ada surat pada kategori ini.
            </td>
          </tr>
        ) : (
          data.map((surat) => (
            <tr key={surat.id} className="border-b hover:bg-gray-50">
              <td className="py-3 px-2">{surat.no_surat ?? '-'}</td>
              <td className="py-3 px-2">{surat.pemohon}</td>
              <td className="py-3 px-2">{surat.jenis}</td>
              <td className="py-3 px-2">{surat.tanggal}</td>
              <td className="py-3 px-2">
                <StatusBadge status={surat.status} />
              </td>
              <td className="py-3 px-2">
                <div className="flex gap-2">
                  <button onClick={() => onView(surat.id)} className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100" title="Lihat detail">
                    👁
                  </button>
                  <button onClick={() => onEdit(surat.id)} className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100" title="Edit">
                    ✎
                  </button>
                  <button onClick={() => onDelete(surat.id)} className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600" title="Hapus">
                    🗑
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}