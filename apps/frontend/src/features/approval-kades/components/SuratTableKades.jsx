// ==========================================
// SuratTableKades.jsx
// Tabel surat khusus Kades.
//
// - Menampilkan status generik.
// - Hanya menyediakan aksi Lihat.
// - Approve/reject dilakukan dari detail
//   melalui ApprovalStepRenderer.
// ==========================================

import { Eye } from 'lucide-react'

import { StatusBadge } from '@/components/ui/StatusBadge'

export default function SuratTableKades({ data, onView }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-gray-500">
          <th className="py-3 px-2 font-medium">No. Surat</th>

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
              Belum ada surat yang masuk level desa.
            </td>
          </tr>
        ) : (
          data.map((surat) => (
            <tr key={surat.id} className="border-b hover:bg-gray-50">
              <td className="py-3 px-2">{surat.no_surat ?? surat.letter_number ?? '-'}</td>

              <td className="py-3 px-2">{surat.pemohon ?? surat.applicant_name ?? '-'}</td>

              <td className="py-3 px-2">{surat.jenis ?? surat.letter_type?.name ?? '-'}</td>

              <td className="py-3 px-2">
                {surat.tanggal ??
                  (surat.submitted_at
                    ? new Date(surat.submitted_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '-')}
              </td>

              <td className="py-3 px-2">
                <StatusBadge status={surat.status} />
              </td>

              <td className="py-3 px-2">
                <button
                  type="button"
                  onClick={() => onView(surat.id)}
                  className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100 text-gray-600"
                  title="Lihat detail"
                  aria-label="Lihat detail"
                >
                  <Eye size={16} />
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}
