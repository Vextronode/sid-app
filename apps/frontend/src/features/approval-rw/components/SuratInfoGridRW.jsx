// ==========================================
// SuratInfoGridRW.jsx
// Menampilkan informasi detail surat RW.
// Mengikuti response backend Laravel RW.
// ==========================================

export default function SuratInfoGridRW({ surat }) {


  const rwApproval = surat.approvals?.find(
    (item) => item.approval_level === "rw"
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
      label: "Diproses RW",
      value: rwApproval?.approved_by?.name ?? "-"
    },


    {
      label: "Keputusan RW",

      value:
        surat.status === "rw_approved"
          ? "Disetujui"
          :
        surat.status === "rw_rejected"
          ? "Ditolak"
          :
          "Menunggu"
    },


    {
      label: "Level Approval",
      value:
        rwApproval?.approval_level?.toUpperCase() ?? "-"
    },


    {
      label: "Waktu Proses",
      value:
        rwApproval?.updated_at
          ? new Date(
              rwApproval.updated_at
            ).toLocaleString("id-ID")
          : "-"
    },

  ];



  return (

    <div className="grid grid-cols-2 gap-x-12 gap-y-3 mb-8">


      <div className="flex flex-col gap-3">

        {kolomKiri.map((item)=>(

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

        {kolomKanan.map((item)=>(

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