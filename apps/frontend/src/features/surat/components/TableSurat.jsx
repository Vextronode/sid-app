import { useState } from "react";
import { Eye, FileText, Download } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DetailSuratModal } from "./DetailSuratModal";

export function TableSurat({ data }) {
  const [selectedSurat, setSelectedSurat] = useState(null);

  const apiUrl =
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

  const handleDownload = (id, template) => {
    window.open(
      `${apiUrl}/api/letters/${id}/download?template=${template}`,
      "_blank"
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-10 bg-white border border-gray-200 rounded-2xl">
        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">
          Belum ada surat terbaru.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white overflow-hidden rounded-2xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-4 border-r text-center">
                  No. Surat
                </th>

                <th className="p-4 border-r text-center">
                  Pemohon
                </th>

                <th className="p-4 border-r text-center">
                  Jenis
                </th>

                <th className="p-4 border-r text-center">
                  Tanggal
                </th>

                <th className="p-4 border-r text-center">
                  Status
                </th>

                <th className="p-4 text-center">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {data.map((item, index) => (
                <tr
                  key={item.id || index}
                  className="hover:bg-gray-50 transition"
                >
                  <td className="p-4 border-r text-center">
                    {item.noSurat || "-"}
                  </td>

                  <td className="p-4 border-r text-center">
                    {item.pemohon}
                  </td>

                  <td className="p-4 border-r text-center">
                    {item.jenis}
                  </td>

                  <td className="p-4 border-r text-center">
                    {item.tanggal}
                  </td>

                  <td className="p-4 border-r text-center">
                    <StatusBadge status={item.status} />
                  </td>

                  <td className="p-4">
                    <div className="flex justify-center gap-2 flex-wrap">

                      {/* Detail */}
                      <button
                        onClick={() => setSelectedSurat(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-300 text-xs hover:bg-gray-100"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detail
                      </button>

                      {/* Wet */}
                      <button
                        onClick={() =>
                          handleDownload(item.id, "wet")
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs hover:bg-blue-700"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Wet
                      </button>

                      {/* Digital */}
                      <button
                        onClick={() =>
                          handleDownload(item.id, "digital")
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-600 text-white text-xs hover:bg-green-700"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Digital
                      </button>

                    </div>
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