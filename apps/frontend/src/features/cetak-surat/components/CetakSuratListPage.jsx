// ==========================================
// CetakSuratListPage.jsx
// Halaman generic dipakai Petugas Desa, Kasi, Kaur — semuanya sama
// fungsinya: lihat surat yang sudah rw_approved, dan cetak PDF-nya.
// Judul & path beda-beda tinggal dikirim via props dari page pembungkus.
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

  const handleSearchSubmit = (e) => { e.preventDefault(); setSearch(keyword); };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="font-medium text-gray-800 text-lg mb-4">{title}</h2>

      <form onSubmit={handleSearchSubmit} className="flex gap-3 mb-4">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Cari nama pemohon..."
          className="flex-1 border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
        />
        <button type="submit" className="bg-green-600 text-white px-4 rounded-md flex items-center justify-center"><Search size={16} /></button>
      </form>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-3 px-4 font-medium">No.Surat</th>
            <th className="py-3 px-4 font-medium">Pemohon</th>
            <th className="py-3 px-4 font-medium">Jenis</th>
            <th className="py-3 px-4 font-medium">Status</th>
            <th className="py-3 px-4 font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={5} className="text-center text-gray-400 py-8">Belum ada surat yang siap dicetak.</td></tr>
          ) : (
            data.map((surat) => (
              <tr key={surat.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">{surat.no_surat}</td>
                <td className="py-3 px-4">{surat.pemohon}</td>
                <td className="py-3 px-4">{surat.jenis}</td>
                <td className="py-3 px-4"><StatusBadgeRT status={surat.status} /></td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button onClick={() => setSelected(surat)} className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100 text-gray-600" title="Lihat"><Eye size={16} /></button>
                    <button onClick={() => generateSuratPDF(surat)} className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700" title="Cetak PDF"><Printer size={16} /></button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl">✕</button>
            <h2 className="font-medium text-gray-800 mb-1">Detail Surat</h2>
            <p className="text-xs text-gray-400 mb-6">#{selected.no_surat}</p>
            <ApprovalStepperRT surat={selected} />
            <SuratInfoGridRT surat={selected} />
            <button onClick={() => generateSuratPDF(selected)} className="bg-green-600 text-white rounded-md px-4 py-2 text-sm font-medium flex items-center gap-2">
              <Printer size={16} /> Cetak PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}