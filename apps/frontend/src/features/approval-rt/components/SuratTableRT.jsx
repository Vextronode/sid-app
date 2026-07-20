import { Eye, Pencil, Trash2 } from 'lucide-react';
import StatusBadgeRT from './StatusBadgeRT';

export default function SuratTableRT({ data, onView, onEdit, onDelete }) {
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
              <td className="py-3 px-2"><StatusBadgeRT status={surat.status} /></td>
              <td className="py-3 px-2">
                <div className="flex gap-2">
                  <button onClick={() => onView(surat.id)} className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100 text-gray-600" title="Lihat detail">
                    <Eye size={16} />
                  </button>
                  <button onClick={() => onEdit(surat.id)} className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100 text-gray-600" title="Edit">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => onDelete(surat.id)} className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600" title="Hapus">
                    <Trash2 size={16} />
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