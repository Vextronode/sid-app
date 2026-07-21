// ==========================================
// SuratInfoGridKasi.jsx
// Menampilkan informasi detail surat Kasi.
// Approval terakhir (final approval).
// ==========================================

export default function SuratInfoGridKasi({ surat }) {

  // ==========================================
  // Approval level Kasi
  // ==========================================
  const kasiApproval = surat.approvals?.find(
    (item) => item.approval_level === "kasi"
  );



  // ==========================================
  // Kolom kiri
  // ==========================================
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

    {
      label: "Keperluan",
      value: surat.purpose ?? "-"
    },

  ];



  // ==========================================
  // Kolom kanan
  // ==========================================
  const kolomKanan = [

    {
      label: "Status",
      value: surat.status ?? "-"
    },

    {
      label: "Diajukan",
      value: surat.created_at
        ? new Date(surat.created_at)
            .toLocaleString("id-ID")
        : "-"
    },

    {
      label: "Diproses Oleh",
      value: kasiApproval?.approved_by?.name ?? "-"
    },

    {
      label: "Keputusan",
      value:
        surat.status === "kasi_approved"
          ? "Disetujui"
          : surat.status === "kasi_rejected"
          ? "Ditolak"
          : "Menunggu"
    },

    {
      label: "Level Approval",
      value:
        kasiApproval?.approval_level?.toUpperCase() ?? "-"
    },

    {
      label: "Waktu Proses",
      value:
        kasiApproval?.updated_at
          ? new Date(
              kasiApproval.updated_at
            ).toLocaleString("id-ID")
          : "-"
    },

    {
      label: "Nomor Surat",
      value: surat.letter_number ?? "-"
    },

    {
      label: "Berlaku Sampai",
      value:
        surat.expires_at
          ? new Date(
              surat.expires_at
            ).toLocaleDateString("id-ID")
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