import { useState } from "react";
import { Eye, FileText } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DetailSuratModal } from "./DetailSuratModal";

export function TableSurat({ data }) {
  // Bikin state untuk nyimpan data surat yang lagi dbuka
  const [selectedSurat, setSelectedSurat] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-10 bg-white border border-gray-200 rounded-2xl">
        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Belum ada surat terbaru.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border border-gray-200">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-4 border-r border-gray-200 text-center">
                  No.Surat
                </th>
                <th className="p-4 border-r border-gray-200 text-center">
                  Pemohon
                </th>
                <th className="p-4 border-r border-gray-200 text-center">
                  Jenis
                </th>
                <th className="p-4 border-r border-gray-200 text-center">
                  Tanggal
                </th>
                <th className="p-4 border-r border-gray-200 text-center">
                  Status
                </th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((item, index) => (
                <tr
                  key={item.id || index}
                  className="hover:bg-gray-50/50 transition"
                >
                  <td className="p-4 border-r border-gray-200 text-center text-gray-800">
                    {item.noSurat || "-"}
                  </td>
                  <td className="p-4 border-r border-gray-200 text-center text-gray-800">
                    {item.pemohon}
                  </td>
                  <td className="p-4 border-r border-gray-200 text-center text-gray-800">
                    {item.jenis}
                  </td>
                  <td className="p-4 border-r border-gray-200 text-center text-gray-800">
                    {item.tanggal}
                  </td>
                  <td className="p-4 border-r border-gray-200 text-center">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => setSelectedSurat(item)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-full text-xs text-gray-600 hover:bg-gray-50 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSurat && (
        <DetailSuratModal
          data={selectedSurat}
          onClose={() => setSelectedSurat(null)}
        />
      )}
    </>
  );
}
