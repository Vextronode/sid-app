// ==========================================
// SuratInfoGridKadus.jsx
// Menampilkan informasi detail surat Kadus.
// ==========================================

export default function SuratInfoGridKadus({ surat }) {

  const kadusApproval = surat.approvals?.find(
    item => item.approval_level === "kadus"
  );

  const kolomKiri = [

    {
      label: "Nama Pemohon",
      value: surat.applicant_name ?? "-"
    },

    {
      label: "NIK",
      value: surat.applicant_nik ?? "-"
    },

    {
      label: "Alamat",
      value: surat.applicant_address ?? "-"
    },

    {
      label: "Jenis Surat",
      value: surat.letter_type?.name ?? "-"
    },

  ];

  const kolomKanan = [

    {
      label: "Status",
      value: surat.status ?? "-"
    },

    {
      label: "Diajukan",
      value: surat.created_at
        ? new Date(
            surat.created_at
          ).toLocaleString("id-ID")
        : "-"
    },

{
  label: "Diproses Kadus",
  value: kadusApproval?.approved_by?.name ?? "-"
},

    {
      label: "Keputusan Kadus",

      value:
        surat.status === "kadus_approved"
          ? "Disetujui"
          : surat.status === "kadus_rejected"
          ? "Ditolak"
          : "Menunggu"

    },

    {
      label: "Level Approval",
      value:
        kadusApproval?.approval_level?.toUpperCase() ?? "-"
    },

    {
      label: "Waktu Proses",
      value:
        kadusApproval?.updated_at
          ? new Date(
              kadusApproval.updated_at
            ).toLocaleString("id-ID")
          : "-"
    },

  ];

  return (

    <div className="grid grid-cols-2 gap-x-12 gap-y-3 mb-8">

      <div className="flex flex-col gap-3">

        {kolomKiri.map((item) => (

          <div
            key={item.label}
            className="grid grid-cols-2 text-sm"
          >

            <span className="text-gray-500">
              {item.label}
            </span>

            <span className="text-gray-800">
              {item.value}
            </span>

          </div>

        ))}

      </div>

      <div className="flex flex-col gap-3">

        {kolomKanan.map((item) => (

          <div
            key={item.label}
            className="grid grid-cols-2 text-sm"
          >

            <span className="text-gray-500">
              {item.label}
            </span>

            <span className="text-gray-800">
              {item.value}
            </span>

          </div>

        ))}

      </div>

    </div>

  );

}