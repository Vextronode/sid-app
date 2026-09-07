// ==========================================
// SuratTableKadus.jsx
// Table surat Kadus.
// Mengikuti response backend seperti RT & RW.
// ==========================================

import { Eye, Pencil, Trash2 } from "lucide-react";
import StatusBadgeKadus from "./StatusBadgeKadus";

export default function SuratTableKadus({
  data,
  onView,
  onEdit,
  onDelete,
}) {

  return (

    <table className="w-full text-sm">

      <thead>

        <tr className="border-b text-left text-gray-500">

          <th className="py-3 px-2 font-medium">
            No. Surat
          </th>

          <th className="py-3 px-2 font-medium">
            Pemohon
          </th>

          <th className="py-3 px-2 font-medium">
            Jenis
          </th>

          <th className="py-3 px-2 font-medium">
            Tanggal
          </th>

          <th className="py-3 px-2 font-medium">
            Status
          </th>

          <th className="py-3 px-2 font-medium">
            Aksi
          </th>

        </tr>

      </thead>

      <tbody>

        {data.length === 0 ? (

          <tr>

            <td
              colSpan={6}
              className="py-8 text-center text-gray-400"
            >
              Belum ada surat.
            </td>

          </tr>

        ) : (

          data.map((surat) => (

            <tr
              key={surat.id}
              className="border-b hover:bg-gray-50"
            >

              <td className="py-3 px-2">
                {surat.id ?? "-"}
              </td>

              <td className="py-3 px-2">
                {surat.citizen?.name ?? "-"}
              </td>

              <td className="py-3 px-2">
                {surat.letter_type?.name ?? "-"}
              </td>

              <td className="py-3 px-2">
                {
                  surat.created_at
                    ? new Date(
                        surat.created_at
                      ).toLocaleDateString("id-ID")
                    : "-"
                }
              </td>

              <td className="py-3 px-2">

                <StatusBadgeKadus
                  status={surat.status}
                />

              </td>

              <td className="py-3 px-2">

                <div className="flex gap-2">

                  <button
                    onClick={() => onView(surat.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border text-gray-600 hover:bg-gray-100"
                    title="Lihat Detail"
                  >
                    <Eye size={16} />
                  </button>

                  <button
                    onClick={() => onEdit(surat.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border text-gray-600 hover:bg-gray-100"
                    title="Proses Surat"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    onClick={() => onDelete(surat.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                    title="Hapus"
                  >
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