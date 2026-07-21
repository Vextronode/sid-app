export default function SuratInfoGridkasi({ surat }) {
  const kolomKiri = [
    { label: 'Nama Pemohon', value: surat.pemohon }, { label: 'NIK', value: surat.nik },
    { label: 'Alamat', value: surat.alamat }, { label: 'Jenis Surat', value: surat.jenis_label },
  ];
  const kolomKanan = [
    { label: 'Keperluan', value: surat.keperluan }, { label: 'Diajukan', value: surat.diajukan_at },
    { label: 'Terakhir diproses', value: surat.terakhir_diproses_at }, { label: 'IP aktor', value: surat.ip_aktor },
  ];
  return (
    <div className="grid grid-cols-2 gap-x-12 gap-y-3 mb-8">
      <div className="flex flex-col gap-3">{kolomKiri.map((i) => (
        <div key={i.label} className="grid grid-cols-2 text-sm"><span className="text-gray-500">{i.label}</span><span className="text-gray-800">{i.value}</span></div>
      ))}</div>
      <div className="flex flex-col gap-3">{kolomKanan.map((i) => (
        <div key={i.label} className="grid grid-cols-2 text-sm"><span className="text-gray-500">{i.label}</span><span className="text-gray-800">{i.value}</span></div>
      ))}</div>
    </div>
  );
}