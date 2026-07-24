export default function SuratInfoGridRT({ surat }) {

  const rtApproval = surat.approvals?.find(
    (item) => item.approval_level === "rt"
  );


  const kolomKiri = [
    {
      label: 'Nama Pemohon',
      value: surat.citizen?.name ?? '-'
    },
    {
      label: 'NIK',
      value: surat.citizen?.nik ?? '-'
    },
    {
      label: 'Alamat',
      value: surat.citizen?.address ?? '-'
    },
    {
      label: 'Jenis Surat',
      value: surat.letter_type?.name ?? '-'
    },
  ];


  const kolomKanan = [
    {
      label: 'Status',
      value: surat.status
    },
    {
      label: 'Diajukan',
      value: surat.created_at
        ? new Date(surat.created_at).toLocaleString("id-ID")
        : '-'
    },
    {
      label: 'Diproses RT',
      value: rtApproval?.approved_by?.name ?? '-'
    },
    {
      label: 'Keputusan RT',
      value:
        surat.status === "rt_approved"
          ? "Disetujui"
          : surat.status === "rt_rejected"
          ? "Ditolak"
          : "Menunggu"
    },
    {
      label: 'Level Approval',
      value: rtApproval?.approval_level?.toUpperCase() ?? '-'
    },
    {
      label: 'Waktu Proses',
      value: rtApproval?.updated_at
        ? new Date(rtApproval.updated_at).toLocaleString("id-ID")
        : '-'
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