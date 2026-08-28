import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, FileText, Edit } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DetailSuratModal } from "./DetailSuratModal";

export function TableSurat({ data }) {
  const [selectedSurat, setSelectedSurat] = useState(null);
  const navigate = useNavigate();

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
      <div className="sid-table-empty">
        <FileText className="sid-table-empty-icon" />

        <p className="sid-table-empty-text">
          Belum ada surat terbaru.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="sid-table-wrapper">
        <div className="overflow-x-auto">
          <table className="sid-table">
            <thead>
              <tr>
                <th>No. Surat</th>
                <th>Pemohon</th>
                <th>Jenis</th>
                <th>Tanggal</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {data.map((item, index) => (
                <tr key={item.id || index}>
                  <td>{item.noSurat || "-"}</td>

                  <td>{item.pemohon}</td>

                  <td>{item.jenis}</td>

                  <td>{item.tanggal}</td>

                  <td>
                    <StatusBadge status={item.status} />
                  </td>

                  <td>
                    <div className="sid-table-actions">

                      {/* Detail */}
                      <button
                        type="button"
                        onClick={() => setSelectedSurat(item)}
                        className="sid-table-btn sid-table-btn-detail"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detail
                      </button>

                      {/* Revisi */}
                      {item.status === "waiting_revision_warga" && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/revisi-surat/${item.id}`)
                          }
                          className="sid-table-btn sid-table-btn-revision"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Revisi
                        </button>
                      )}

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